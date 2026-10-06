const { Op, fn, col } = require('sequelize');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { sequelize } = require('../config/database');
const { getPagination, getSort, buildPaginationMeta, withSortable } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { nextUniqueHospitalNumber } = require('../utils/codeGenerator');
const { calculateAge } = require('../utils/dates');
const { roleNameOf, scopePatientQuery, assertPatientAccess } = require('../utils/accessControl');
const { PATIENT_STATUS } = require('../config/constants');
const { hashPassword } = require('../utils/password');
const {
  Patient,
  User,
  Role,
  Allergy,
  MedicalCondition,
  MedicalHistory,
  InsurancePolicy,
  InsuranceProvider,
} = require('../models');

/**
 * Patient registry.
 *
 * Access rules enforced here (never in the frontend):
 *  - a PATIENT account may only resolve its own record
 *  - roles without patient-level permission are rejected outright
 *  - a patient created through reception may optionally receive a login
 */

const SORTABLE = withSortable(
  ['createdAt', 'updatedAt', 'lastName', 'firstName', 'hospitalNumber', 'dateOfBirth'],
  ['phone', 'email', 'status'],
);

const PATIENT_ATTRIBUTES = undefined; // full record

/** Decorates a patient row for API output. */
function present(patient) {
  if (!patient) return null;
  const plain = typeof patient.get === 'function' ? patient.get({ plain: true }) : patient;
  return {
    ...plain,
    fullName: [plain.firstName, plain.middleName, plain.lastName].filter(Boolean).join(' '),
    age: calculateAge(plain.dateOfBirth),
  };
}

/** Throws unless the principal may see `patient`. */
function assertCanRead(user, patient) {
  const access = assertPatientAccess(user, patient, { write: false });
  if (!access.ok) throw AppError.forbidden(access.message);
  return access;
}

function assertCanWrite(user, patient) {
  const access = assertPatientAccess(user, patient, { write: true });
  if (!access.ok) throw AppError.forbidden(access.message);
  return access;
}

/** Resolves a patient the caller is allowed to read, or throws. */
async function findReadable(user, id, options = {}) {
  const patient = await Patient.findByPk(id, options);
  if (!patient) throw AppError.notFound('Patient not found');
  assertCanRead(user, patient);
  return patient;
}

/* ------------------------------------------------------------------ *
 * Queries
 * ------------------------------------------------------------------ */

async function list({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const order = getSort(query, SORTABLE, [['createdAt', 'DESC']]);

  const where = combineWhere(
    scopePatientQuery(user),
    query.status ? { status: query.status } : null,
    query.gender ? { gender: query.gender } : null,
    query.bloodGroup ? { bloodGroup: query.bloodGroup } : null,
    query.departmentId ? undefined : null,
    searchWhere(query.search, [
      ['hospitalNumber', 'string'],
      ['firstName', 'string'],
      ['lastName', 'string'],
      ['middleName', 'string'],
      ['phone', 'string'],
      ['email', 'string'],
    ]),
    query.hospitalNumber ? { hospitalNumber: { [Op.iLike]: `%${query.hospitalNumber}%` } } : null,
    query.phone ? { phone: { [Op.iLike]: `%${query.phone}%` } } : null,
    query.email ? { email: { [Op.iLike]: `%${query.email}%` } } : null,
    query.createdFrom ? { createdAt: { [Op.gte]: new Date(query.createdFrom) } } : null,
    query.createdTo ? { createdAt: { [Op.lte]: new Date(query.createdTo) } } : null,
  );

  const { rows, count } = await Patient.findAndCountAll({ where, order, limit, offset, distinct: true });

  return {
    patients: rows.map(present),
    pagination: buildPaginationMeta({ page, limit, total: count }),
  };
}

async function getById({ user, id, includeClinical = false }) {
  const patient = await findReadable(user, id);

  const result = present(patient);

  if (includeClinical) {
    const [allergies, conditions, history, policies] = await Promise.all([
      Allergy.findAll({ where: { patientId: patient.id }, order: [['severity', 'DESC']] }),
      MedicalCondition.findAll({ where: { patientId: patient.id }, order: [['diagnosedAt', 'DESC']] }),
      MedicalHistory.findAll({ where: { patientId: patient.id }, order: [['onsetDate', 'DESC']] }),
      InsurancePolicy.findAll({
        where: { patientId: patient.id },
        include: [{ model: InsuranceProvider, as: 'provider', attributes: ['id', 'name', 'code'] }],
        order: [['isPrimary', 'DESC']],
      }),
    ]);

    result.allergies = allergies.map((a) => a.get({ plain: true }));
    result.conditions = conditions.map((c) => c.get({ plain: true }));
    result.history = history.map((h) => h.get({ plain: true }));
    result.insurancePolicies = policies.map((p) => ({
      ...p.get({ plain: true }),
      provider: p.provider ? p.provider.get({ plain: true }) : null,
    }));
  }

  // The linked portal account (never the password hash).
  const account = await User.findOne({ where: { patientId: patient.id }, attributes: ['id', 'email', 'status'] });
  result.account = account ? account.get({ plain: true }) : null;

  return result;
}

/** Lightweight directory lookup used by pickers in the UI. */
async function searchDirectory({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const where = combineWhere(
    scopePatientQuery(user),
    { status: { [Op.ne]: PATIENT_STATUS.DECEASED } },
    searchWhere(query.search, [['hospitalNumber', 'string'], ['firstName', 'string'], ['lastName', 'string']]),
  );

  const { rows, count } = await Patient.findAndCountAll({
    where,
    attributes: ['id', 'hospitalNumber', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'phone', 'bloodGroup'],
    order: [['lastName', 'ASC']],
    limit,
    offset,
  });

  return {
    patients: rows.map((row) => ({
      ...row.get({ plain: true }),
      fullName: `${row.firstName} ${row.lastName || ''}`.trim(),
      age: calculateAge(row.dateOfBirth),
    })),
    pagination: buildPaginationMeta({ page, limit, total: count }),
  };
}

/* ------------------------------------------------------------------ *
 * Mutations
 * ------------------------------------------------------------------ */

const PATIENT_FIELDS = [
  'firstName',
  'lastName',
  'middleName',
  'dateOfBirth',
  'gender',
  'phone',
  'email',
  'address',
  'city',
  'state',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelationship',
  'bloodGroup',
  'genotype',
  'maritalStatus',
  'occupation',
  'status',
];

/**
 * Creates a patient (and optionally their portal login) in one transaction so a
 * failed account creation never leaves an orphan patient row.
 */
async function create({ user, data, createLogin = false }) {
  if (!PATIENT_READ_FOR_CREATE(user)) throw AppError.forbidden('You may not register patients');

  return sequelize.transaction(async (transaction) => {
    const payload = {};
    PATIENT_FIELDS.forEach((field) => {
      if (data[field] !== undefined) payload[field] = data[field];
    });
    payload.hospitalNumber = await nextUniqueHospitalNumber({ transaction });
    payload.registeredBy = user?.id ?? null;
    payload.status = payload.status || PATIENT_STATUS.ACTIVE;

    const patient = await Patient.create(payload, { transaction });

    if (createLogin && data.password && data.email) {
      const role = await Role.findOne({ where: { name: 'PATIENT' }, transaction });
      if (!role) throw AppError.internal('Patient role is not configured');

      const existing = await User.findOne({ where: { email: data.email }, transaction });
      if (existing) throw AppError.conflict('An account with this email already exists');

      const account = await User.create(
        {
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: data.email,
          phone: patient.phone,
          passwordHash: await hashPassword(data.password),
          roleId: role.id,
          status: 'ACTIVE',
          patientId: patient.id,
          createdBy: user?.id ?? null,
        },
        { transaction },
      );

      patient.portalAccountId = account.id;
    }

    const created = await Patient.findByPk(patient.id, { transaction });
    return present(created);
  });
}

function PATIENT_READ_FOR_CREATE(user) {
  if (!user) return false;
  return ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(roleNameOf(user));
}

async function update({ user, id, data }) {
  const patient = await Patient.findByPk(id);
  if (!patient) throw AppError.notFound('Patient not found');

  // Patients may only edit their own contact details and nothing else.
  if (roleNameOf(user) === 'PATIENT') {
    const editable = ['phone', 'email', 'address', 'city', 'state', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship', 'occupation'];
    const attempted = Object.keys(data).filter((key) => !editable.includes(key));
    if (attempted.length) {
      throw AppError.forbidden(`You cannot modify: ${attempted.join(', ')}`);
    }
    assertCanWrite(user, patient);
  }

  const payload = {};
  PATIENT_FIELDS.forEach((field) => {
    if (data[field] !== undefined) payload[field] = data[field];
  });
  payload.updatedBy = user?.id ?? null;

  await patient.update(payload);
  return present(patient);
}

/**
 * Soft delete: the row is retained (clinical history references it) and the
 * status flips to INACTIVE, which hides the patient from operational lists.
 */
async function remove({ user, id }) {
  const patient = await Patient.findByPk(id);
  if (!patient) throw AppError.notFound('Patient not found');
  if (roleNameOf(user) === 'PATIENT') throw AppError.forbidden('Patients cannot delete their record');

  const activeAdmissions = await require('../models').Admission.count({
    where: { patientId: patient.id, status: { [Op.in]: ['ADMITTED', 'TRANSFERRED'] } },
  });
  if (activeAdmissions > 0) {
    throw AppError.conflict('Patient still has an active admission. Discharge the patient first.');
  }

  await patient.update({ status: PATIENT_STATUS.INACTIVE, updatedBy: user?.id ?? null });
  return { id: patient.id, hospitalNumber: patient.hospitalNumber, status: patient.status };
}

async function statistics({ user }) {
  const scoped = scopePatientQuery(user);
  const [total, byGender, byStatus, newThisMonth] = await Promise.all([
    Patient.count({ where: scoped }),
    Patient.findAll({
      where: scoped,
      attributes: ['gender', [fn('COUNT', col('id')), 'count']],
      group: ['gender'],
      raw: true,
    }),
    Patient.findAll({
      where: scoped,
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),
    Patient.count({
      where: {
        ...scoped,
        createdAt: { [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ]);

  return {
    total,
    newThisMonth,
    byGender: byGender.reduce((acc, row) => ({ ...acc, [row.gender || 'UNKNOWN']: Number(row.count) }), {}),
    byStatus: byStatus.reduce((acc, row) => ({ ...acc, [row.status]: Number(row.count) }), {}),
  };
}

/* ------------------------------------------------------------------ *
 * Clinical sub-resources owned by the patient record
 * ------------------------------------------------------------------ */

const allergyService = {
  async list({ user, patientId }) {
    await findReadable(user, patientId);
    const rows = await Allergy.findAll({ where: { patientId }, order: [['diagnosedAt', 'DESC']] });
    return rows.map((row) => row.get({ plain: true }));
  },

  async add({ user, patientId, data }) {
    const patient = await findReadable(user, patientId);
    if (roleNameOf(user) === 'PATIENT') throw AppError.forbidden('Only clinical staff may record allergies');
    const row = await Allergy.create({ ...data, patientId: patient.id });
    await refreshAllergySummary(patient.id);
    return row.get({ plain: true });
  },

  async remove({ user, patientId, id }) {
    const patient = await findReadable(user, patientId);
    if (roleNameOf(user) === 'PATIENT') throw AppError.forbidden('Only clinical staff may modify allergies');
    await Allergy.destroy({ where: { id, patientId: patient.id } });
    await refreshAllergySummary(patient.id);
    return { removed: true };
  },
};

const conditionService = {
  async list({ user, patientId }) {
    await findReadable(user, patientId);
    const rows = await MedicalCondition.findAll({ where: { patientId }, order: [['diagnosedAt', 'DESC']] });
    return rows.map((row) => row.get({ plain: true }));
  },

  async add({ user, patientId, data }) {
    const patient = await findReadable(user, patientId);
    if (roleNameOf(user) === 'PATIENT') throw AppError.forbidden('Only clinical staff may record conditions');
    const row = await MedicalCondition.create({ ...data, patientId: patient.id });
    return row.get({ plain: true });
  },

  async update({ user, patientId, id, data }) {
    const patient = await findReadable(user, patientId);
    if (roleNameOf(user) === 'PATIENT') throw AppError.forbidden('Only clinical staff may modify conditions');
    const row = await MedicalCondition.findOne({ where: { id, patientId: patient.id } });
    if (!row) throw AppError.notFound('Condition not found');
    await row.update(data);
    return row.get({ plain: true });
  },

  async remove({ user, patientId, id }) {
    const patient = await findReadable(user, patientId);
    if (roleNameOf(user) === 'PATIENT') throw AppError.forbidden('Only clinical staff may modify conditions');
    await MedicalCondition.destroy({ where: { id, patientId: patient.id } });
    return { removed: true };
  },
};

const historyService = {
  async list({ user, patientId }) {
    await findReadable(user, patientId);
    const rows = await MedicalHistory.findAll({ where: { patientId }, order: [['onsetDate', 'DESC']] });
    return rows.map((row) => row.get({ plain: true }));
  },

  async add({ user, patientId, data }) {
    const patient = await findReadable(user, patientId);
    if (roleNameOf(user) === 'PATIENT') throw AppError.forbidden('Only clinical staff may record history');
    const row = await MedicalHistory.create({ ...data, patientId: patient.id });
    return row.get({ plain: true });
  },
};

/** Keeps `patients.allergy_summary` in step with the allergy table. */
async function refreshAllergySummary(patientId) {
  const rows = await Allergy.findAll({ where: { patientId }, attributes: ['allergen', 'severity'] });
  const summary = rows.map((row) => `${row.allergen} (${row.severity})`).join(', ') || null;
  await Patient.update({ allergySummary: summary }, { where: { id: patientId } });
}

module.exports = {
  list,
  getById,
  searchDirectory,
  create,
  update,
  remove,
  statistics,
  findReadable,
  present,
  assertCanRead,
  assertCanWrite,
  refreshAllergySummary,
  allergies: allergyService,
  conditions: conditionService,
  history: historyService,
  SORTABLE,
  HOSPITAL_NUMBER_PREFIX: env.HOSPITAL_NUMBER_PREFIX,
  PATIENT_ATTRIBUTES,
};