const { Op, fn, col } = require('sequelize');
const AppError = require('../utils/AppError');
const { sequelize } = require('../config/database');
const { getPagination, getSort, buildPaginationMeta, withSortable } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { numbered } = require('../utils/codeGenerator');
const { toDateOnly } = require('../utils/dates');
const { roleNameOf, isClinicalStaff } = require('../utils/accessControl');
const { CONSULTATION_STATUS, MEDICAL_RECORD_TYPES } = require('../config/constants');
const { EVENTS } = require('../realtime/events');
const realtime = require('../realtime/socket');
const medicalRecordService = require('./medicalRecord.service');
const notificationService = require('./notification.service');
const {
  Consultation,
  Patient,
  Doctor,
  Department,
  User,
  Appointment,
  QueueEntry,
  Admission,
  Diagnosis,
  VitalSign,
} = require('../models');

/**
 * Doctor consultations.
 *
 * A consultation is the clinical hub of a visit: it carries the SOAP notes, the
 * diagnoses, the vitals, and it is the parent of lab orders, imaging orders and
 * prescriptions. Every state change appends an entry to the patient's medical
 * timeline (see `medicalRecord.service`).
 */

const SORTABLE = withSortable(['createdAt', 'updatedAt', 'startedAt', 'completedAt', 'consultationNumber', 'status']);

const CONSULTATION_INCLUDES = [
  { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'bloodGroup', 'allergySummary'] },
  { model: Doctor, as: 'doctor', attributes: ['id', 'specialization'], include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }] },
  { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
  { model: Appointment, as: 'appointment', attributes: ['id', 'appointmentNumber', 'appointmentDate', 'startTime', 'status'] },
];

const SOAP_FIELDS = [
  'chiefComplaint',
  'symptoms',
  'history',
  'physicalExamination',
  'assessment',
  'diagnosisSummary',
  'treatmentPlan',
  'doctorNotes',
];

function present(consultation) {
  if (!consultation) return null;
  const plain = consultation.get({ plain: true });
  return {
    ...plain,
    patientName: plain.patient ? `${plain.patient.firstName} ${plain.patient.lastName || ''}`.trim() : null,
    doctorName:
      plain.doctor && plain.doctor.user ? `Dr ${plain.doctor.user.firstName} ${plain.doctor.user.lastName || ''}` : null,
  };
}

/** Only clinicians may open a consultation; patients may read their own. */
function assertCanWrite(user) {
  if (!isClinicalStaff(user) && !['SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(roleNameOf(user))) {
    throw AppError.forbidden('Only clinical staff may author consultations');
  }
}

async function findReadable(user, id, options = {}) {
  const consultation = await Consultation.findByPk(id, options);
  if (!consultation) throw AppError.notFound('Consultation not found');
  if (roleNameOf(user) === 'PATIENT' && Number(consultation.patientId) !== Number(user.patientId)) {
    throw AppError.forbidden('You are not authorised to view this consultation');
  }
  return consultation;
}

async function list({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const order = getSort(query, SORTABLE, [['createdAt', 'DESC']]);

  const where = combineWhere(
    roleNameOf(user) === 'PATIENT' ? { patientId: user.patientId ?? -1 } : undefined,
    query.patientId ? { patientId: Number(query.patientId) } : undefined,
    query.doctorId ? { doctorId: Number(query.doctorId) } : undefined,
    query.departmentId ? { departmentId: Number(query.departmentId) } : undefined,
    query.appointmentId ? { appointmentId: Number(query.appointmentId) } : undefined,
    query.status ? { status: query.status } : undefined,
    query.from ? { createdAt: { [Op.gte]: new Date(query.from) } } : undefined,
    query.to ? { createdAt: { [Op.lte]: new Date(query.to) } } : undefined,
    query.active === true ? { status: { [Op.in]: ['DRAFT', 'IN_PROGRESS'] } } : undefined,
    searchWhere(query.search, [['consultationNumber', 'string'], ['chiefComplaint', 'string']]),
  );

  const { rows, count } = await Consultation.findAndCountAll({
    where,
    include: CONSULTATION_INCLUDES,
    order,
    limit,
    offset,
    distinct: true,
  });

  return { consultations: rows.map(present), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

async function getById({ user, id }) {
  const consultation = await findReadable(user, id, { include: CONSULTATION_INCLUDES });
  const [diagnoses, vitals] = await Promise.all([
    Diagnosis.findAll({ where: { consultationId: consultation.id }, order: [['diagnosedAt', 'ASC']] }),
    VitalSign.findAll({ where: { consultationId: consultation.id }, order: [['recordedAt', 'ASC']] }),
  ]);

  return {
    ...present(consultation),
    diagnoses: diagnoses.map((d) => d.get({ plain: true })),
    vitalSigns: vitals.map((v) => v.get({ plain: true })),
  };
}

async function nextConsultationNumber({ transaction }) {
  const last = await Consultation.findOne({ order: [['id', 'DESC']], attributes: ['consultationNumber'], transaction });
  let sequence = 1;
  if (last && typeof last.consultationNumber === 'string') {
    const parsed = Number.parseInt(last.consultationNumber.split('-').pop(), 10);
    if (Number.isFinite(parsed)) sequence = parsed + 1;
  }
  return numbered('CON', sequence);
}

/**
 * Starts a consultation. When it originates from a queue entry or an
 * appointment, that record is linked and moved to IN_CONSULTATION.
 */
async function start({ user, data }) {
  assertCanWrite(user);

  const patient = await Patient.findByPk(data.patientId);
  if (!patient) throw AppError.notFound('Patient not found');

  let doctor = null;
  if (data.doctorId) {
    doctor = await Doctor.findByPk(data.doctorId);
  } else {
    const profile = await Doctor.findOne({ where: { userId: user.id } });
    doctor = profile;
  }
  if (!doctor) throw AppError.badRequest('No doctor profile is attached to your account');

  const departmentId = data.departmentId ?? doctor.departmentId;

  if (data.appointmentId) {
    const appointment = await Appointment.findByPk(data.appointmentId);
    if (!appointment) throw AppError.notFound('Appointment not found');
    if (Number(appointment.patientId) !== Number(patient.id)) {
      throw AppError.badRequest('Appointment belongs to a different patient');
    }
  }

  const consultation = await sequelize.transaction(async (transaction) => {
    const created = await Consultation.create(
      {
        consultationNumber: await nextConsultationNumber({ transaction }),
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: data.appointmentId ?? null,
        queueEntryId: data.queueEntryId ?? null,
        admissionId: data.admissionId ?? null,
        departmentId,
        status: CONSULTATION_STATUS.IN_PROGRESS,
        chiefComplaint: data.chiefComplaint ?? null,
        symptoms: data.symptoms ?? null,
        history: data.history ?? null,
        physicalExamination: data.physicalExamination ?? null,
        assessment: data.assessment ?? null,
        diagnosisSummary: data.diagnosisSummary ?? null,
        treatmentPlan: data.treatmentPlan ?? null,
        doctorNotes: data.doctorNotes ?? null,
        vitalsSnapshot: data.vitalsSnapshot ?? null,
        followUpDate: data.followUpDate ?? null,
        startedAt: new Date(),
        createdBy: user.id,
      },
      { transaction },
    );

    if (data.appointmentId) {
      await Appointment.update(
        { status: 'IN_CONSULTATION', startedAt: new Date(), updatedBy: user.id },
        { where: { id: data.appointmentId } },
        { transaction },
      );
    }

    if (data.queueEntryId) {
      await QueueEntry.update(
        { status: 'IN_SERVICE', servedAt: new Date(), updatedBy: user.id },
        { where: { id: data.queueEntryId } },
        { transaction },
      );
    }

    if (data.admissionId) {
      await Admission.update({ consultationId: created.id }, { where: { id: data.admissionId } }, { transaction });
    }

    return created;
  });

  const full = await Consultation.findByPk(consultation.id, { include: CONSULTATION_INCLUDES });

  await medicalRecordService.append({
    user,
    patientId: patient.id,
    recordType: MEDICAL_RECORD_TYPES.CONSULTATION,
    title: `Consultation ${consultation.consultationNumber}`,
    summary: data.chiefComplaint || 'Consultation started',
    referenceType: 'consultation',
    referenceId: consultation.id,
    consultationId: consultation.id,
    admissionId: data.admissionId ?? null,
    departmentId,
    occurredAt: new Date(),
  });

  realtime.emitToDepartment(departmentId, EVENTS.CONSULTATION_STARTED, present(full));
  realtime.emitToPatient(patient.id, EVENTS.CONSULTATION_STARTED, present(full));

  return present(full);
}

async function update({ user, id, data }) {
  assertCanWrite(user);
  const consultation = await findReadable(user, id);

  if (consultation.status === CONSULTATION_STATUS.COMPLETED && !data.allowCompletedEdit) {
    throw AppError.conflict('A completed consultation can no longer be edited');
  }

  const patch = { updatedBy: user.id };
  SOAP_FIELDS.forEach((field) => {
    if (data[field] !== undefined) patch[field] = data[field];
  });
  if (data.followUpDate !== undefined) patch.followUpDate = data.followUpDate;
  if (data.vitalsSnapshot !== undefined) patch.vitalsSnapshot = data.vitalsSnapshot;
  if (data.status !== undefined) patch.status = data.status;

  await consultation.update(patch);
  return getById({ user, id: consultation.id });
}

async function complete({ user, id, data = {} }) {
  assertCanWrite(user);
  const consultation = await findReadable(user, id);

  if (consultation.status === CONSULTATION_STATUS.COMPLETED) {
    throw AppError.conflict('Consultation is already completed');
  }

  const patch = {
    status: CONSULTATION_STATUS.COMPLETED,
    completedAt: new Date(),
    updatedBy: user.id,
  };
  SOAP_FIELDS.forEach((field) => {
    if (data[field] !== undefined) patch[field] = data[field];
  });
  if (data.followUpDate !== undefined) patch.followUpDate = data.followUpDate;

  await sequelize.transaction(async (transaction) => {
    await consultation.update(patch, { transaction });

    if (consultation.appointmentId) {
      await Appointment.update(
        { status: 'COMPLETED', completedAt: new Date(), updatedBy: user.id },
        { where: { id: consultation.appointmentId } },
        { transaction },
      );
    }

    if (consultation.queueEntryId) {
      await QueueEntry.update(
        { status: 'COMPLETED', completedAt: new Date(), updatedBy: user.id },
        { where: { id: consultation.queueEntryId } },
        { transaction },
      );
    }
  });

  await medicalRecordService.append({
    user,
    patientId: consultation.patientId,
    recordType: MEDICAL_RECORD_TYPES.CONSULTATION,
    title: `Consultation completed ${consultation.consultationNumber}`,
    summary: consultation.diagnosisSummary || consultation.assessment || consultation.chiefComplaint || null,
    referenceType: 'consultation',
    referenceId: consultation.id,
    consultationId: consultation.id,
    admissionId: consultation.admissionId,
    departmentId: consultation.departmentId,
    occurredAt: new Date(),
  });

  realtime.emitToDepartment(consultation.departmentId, EVENTS.CONSULTATION_COMPLETED, present(consultation));
  realtime.emitToPatient(consultation.patientId, EVENTS.CONSULTATION_COMPLETED, present(consultation));

  return getById({ user, id: consultation.id });
}

/* ------------------------------------------------------------------ *
 * Diagnoses & vitals recorded inside a consultation
 * ------------------------------------------------------------------ */

async function addDiagnosis({ user, consultationId, data }) {
  assertCanWrite(user);
  const consultation = await findReadable(user, consultationId);

  const diagnosis = await Diagnosis.create({
    patientId: consultation.patientId,
    consultationId: consultation.id,
    code: data.code ?? null,
    description: data.description,
    type: data.type || 'PRIMARY',
    status: data.status || 'ACTIVE',
    notes: data.notes ?? null,
    diagnosedBy: user.id,
    diagnosedAt: data.diagnosedAt || new Date(),
  });

  await medicalRecordService.append({
    user,
    patientId: consultation.patientId,
    recordType: MEDICAL_RECORD_TYPES.DIAGNOSIS,
    title: `${data.type || 'PRIMARY'} diagnosis: ${data.description}`,
    summary: data.notes ?? null,
    referenceType: 'diagnosis',
    referenceId: diagnosis.id,
    consultationId: consultation.id,
    departmentId: consultation.departmentId,
    occurredAt: diagnosis.diagnosedAt,
  });

  return diagnosis.get({ plain: true });
}

async function updateDiagnosis({ user, diagnosisId, data }) {
  assertCanWrite(user);
  const diagnosis = await Diagnosis.findByPk(diagnosisId);
  if (!diagnosis) throw AppError.notFound('Diagnosis not found');

  const patch = {};
  ['code', 'description', 'type', 'status', 'notes'].forEach((field) => {
    if (data[field] !== undefined) patch[field] = data[field];
  });
  if (data.status === 'RESOLVED') patch.resolvedAt = new Date();

  await diagnosis.update(patch);
  return diagnosis.get({ plain: true });
}

async function recordVitals({ user, patientId, consultationId, data }) {
  assertCanWrite(user);
  const consultation = consultationId ? await findReadable(user, consultationId) : null;
  const targetPatientId = consultation ? consultation.patientId : Number(patientId);
  if (!targetPatientId) throw AppError.badRequest('patientId is required');

  const vitals = await VitalSign.create({
    patientId: targetPatientId,
    consultationId: consultation ? consultation.id : null,
    admissionId: consultation?.admissionId ?? data.admissionId ?? null,
    temperature: data.temperature ?? null,
    pulse: data.pulse ?? null,
    respiratoryRate: data.respiratoryRate ?? null,
    bloodPressureSystolic: data.bloodPressureSystolic ?? null,
    bloodPressureDiastolic: data.bloodPressureDiastolic ?? null,
    spo2: data.spo2 ?? null,
    bloodGlucose: data.bloodGlucose ?? null,
    weight: data.weight ?? null,
    height: data.height ?? null,
    bmi: computeBmi(data.weight, data.height),
    painScore: data.painScore ?? null,
    notes: data.notes ?? null,
    recordedAt: data.recordedAt || new Date(),
    recordedBy: user.id,
  });

  realtime.emitToPatient(targetPatientId, EVENTS.VITAL_SIGNS_RECORDED, {
    patientId: targetPatientId,
    recordedAt: vitals.recordedAt,
  });

  return vitals.get({ plain: true });
}

function computeBmi(weight, height) {
  const w = Number(weight);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const metres = h / 100;
  return Number((w / (metres * metres)).toFixed(2));
}

/* ------------------------------------------------------------------ *
 * Previous clinical history (shown to the doctor before they type)
 * ------------------------------------------------------------------ */

async function clinicalHistory({ user, patientId }) {
  const patient = await Patient.findByPk(patientId);
  if (!patient) throw AppError.notFound('Patient not found');
  if (roleNameOf(user) === 'PATIENT' && Number(user.patientId) !== Number(patientId)) {
    throw AppError.forbidden('You are not authorised to view this history');
  }

  const [previousConsultations, diagnoses, allergies, medications] = await Promise.all([
    Consultation.findAll({
      where: { patientId, status: 'COMPLETED' },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['id'], include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }] },
      ],
      order: [['completedAt', 'DESC']],
      limit: 10,
    }),
    Diagnosis.findAll({ where: { patientId }, order: [['diagnosedAt', 'DESC']], limit: 20 }),
    require('../models').Allergy.findAll({ where: { patientId } }),
    require('../models').Prescription.findAll({
      where: { patientId },
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [{ model: require('../models').PrescriptionItem, as: 'items', attributes: ['medicationId', 'dosage', 'frequency', 'duration'] }],
    }),
  ]);

  const timeline = await medicalRecordService.timeline({ user, patientId, limit: 20 });

  return {
    patient: {
      id: patient.id,
      hospitalNumber: patient.hospitalNumber,
      name: patient.getFullName(),
      dateOfBirth: patient.dateOfBirth,
      bloodGroup: patient.bloodGroup,
      genotype: patient.genotype,
      age: patient.getAge(),
    },
    allergies: allergies.map((a) => a.get({ plain: true })),
    previousConsultations: previousConsultations.map((c) => ({
      id: c.id,
      consultationNumber: c.consultationNumber,
      completedAt: c.completedAt,
      chiefComplaint: c.chiefComplaint,
      diagnosisSummary: c.diagnosisSummary,
      doctor: c.doctor?.user ? `Dr ${c.doctor.user.firstName} ${c.doctor.user.lastName}` : null,
    })),
    diagnoses: diagnoses.map((d) => d.get({ plain: true })),
    medications: medications.map((p) => ({
      id: p.id,
      prescriptionNumber: p.prescriptionNumber,
      status: p.status,
      createdAt: p.createdAt,
      items: (p.items || []).map((item) => item.get({ plain: true })),
    })),
    recentTimeline: timeline.events,
  };
}

/** Follow-ups a doctor has scheduled. */
async function followUpList({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const today = toDateOnly();

  const where = combineWhere(
    { followUpDate: { [Op.gte]: today } },
    roleNameOf(user) === 'PATIENT' ? { patientId: user.patientId ?? -1 } : undefined,
    query.patientId ? { patientId: Number(query.patientId) } : undefined,
    query.doctorId ? { doctorId: Number(query.doctorId) } : undefined,
  );

  const { rows, count } = await Consultation.findAndCountAll({
    where,
    include: CONSULTATION_INCLUDES,
    order: [['followUpDate', 'ASC']],
    limit,
    offset,
    distinct: true,
  });

  return { followUps: rows.map(present), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

async function statistics({ query = {} }) {
  const day = query.date || toDateOnly();
  const [started, completed, active] = await Promise.all([
    Consultation.count({ where: { startedAt: { [Op.gte]: new Date(`${day}T00:00:00Z`) } } }),
    Consultation.count({ where: { status: 'COMPLETED', completedAt: { [Op.gte]: new Date(`${day}T00:00:00Z`) } } }),
    Consultation.count({ where: { status: { [Op.in]: ['DRAFT', 'IN_PROGRESS'] } } }),
  ]);

  const byDoctor = await Consultation.findAll({
    where: { startedAt: { [Op.gte]: new Date(`${day}T00:00:00Z`) } },
    attributes: ['doctorId', [fn('COUNT', col('id')), 'count']],
    group: ['doctorId'],
    raw: true,
  });

  return { date: day, started, completed, active, byDoctor };
}

module.exports = {
  list,
  getById,
  start,
  update,
  complete,
  addDiagnosis,
  updateDiagnosis,
  recordVitals,
  clinicalHistory,
  followUpList,
  statistics,
  findReadable,
  present,
  computeBmi,
  SOAP_FIELDS,
  SORTABLE,
  CONSULTATION_INCLUDES,
  notificationService,
};