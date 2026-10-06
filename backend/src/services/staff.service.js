const { Op, fn, col } = require('sequelize');
const { sequelize } = require('../config/database');
const AppError = require('../utils/AppError');
const { getPagination, getSort, buildPaginationMeta, withSortable } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { hashPassword } = require('../utils/password');
const { roleNameOf } = require('../utils/accessControl');
const { USER_STATUS, STAFF_TYPES, AUDIT_ACTIONS, ROLES } = require('../config/constants');
const { P } = require('../config/permissions');
const auditService = require('./audit.service');
const notificationService = require('./notification.service');
const { User, Role, Doctor, Nurse, Staff, Department, DepartmentStaff, RolePermission, Permission } = require('../models');

/**
 * Staff administration: accounts, clinical profiles (doctor / nurse / staff),
 * role assignment and department placement.
 */

const SORTABLE = withSortable(['createdAt', 'updatedAt', 'lastName', 'firstName', 'email', 'lastLoginAt']);

const SAFE_ATTRIBUTES = [
  'id',
  'firstName',
  'lastName',
  'email',
  'phone',
  'roleId',
  'status',
  'patientId',
  'employeeId',
  'gender',
  'address',
  'avatarUrl',
  'lastLoginAt',
  'emailVerifiedAt',
  'mustChangePassword',
  'createdAt',
];

function present(user) {
  return user.get({ plain: true, attributes: SAFE_ATTRIBUTES });
}

async function list({ query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const order = getSort(query, SORTABLE, [['createdAt', 'DESC']]);

  const where = combineWhere(
    query.role ? { role: { name: query.role } } : undefined,
    query.roleId ? { roleId: query.roleId } : undefined,
    query.status ? { status: query.status } : undefined,
    query.departmentId ? { assignedDepartments: { id: query.departmentId } } : undefined,
    searchWhere(query.search, [
      ['firstName', 'string'],
      ['lastName', 'string'],
      ['email', 'string'],
      ['employeeId', 'string'],
      ['phone', 'string'],
    ]),
  );

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: SAFE_ATTRIBUTES,
    include: [
      { model: Role, as: 'role', attributes: ['id', 'name'] },
      { model: Department, as: 'assignedDepartments', attributes: ['id', 'name', 'code'], through: { attributes: [] } },
      { model: Doctor, as: 'doctorProfile', attributes: ['id', 'specialization', 'licenseNumber', 'consultationFee', 'departmentId'] },
      { model: Nurse, as: 'nurseProfile', attributes: ['id', 'specialization', 'shift', 'departmentId'] },
      { model: Staff, as: 'staffProfile', attributes: ['id', 'staffType', 'jobTitle', 'departmentId'] },
    ],
    order,
    limit,
    offset,
    distinct: true,
  });

  return { staff: rows.map(present), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

async function getById({ id }) {
  const user = await User.findByPk(id, {
    attributes: SAFE_ATTRIBUTES,
    include: [
      { model: Role, as: 'role', attributes: ['id', 'name'] },
      { model: Department, as: 'assignedDepartments', attributes: ['id', 'name', 'code'], through: { attributes: [] } },
      { model: Doctor, as: 'doctorProfile' },
      { model: Nurse, as: 'nurseProfile' },
      { model: Staff, as: 'staffProfile' },
    ],
  });
  if (!user) throw AppError.notFound('Staff account not found');
  return present(user);
}

/**
 * Creates a staff account plus the profile row that matches the role, and
 * (optionally) their department assignment - all in one transaction.
 */
async function create({ user: actor, data }) {
  const email = String(data.email).trim().toLowerCase();

  const existing = await User.findOne({ where: { email } });
  if (existing) throw AppError.conflict('An account with this email already exists');

  const role = await Role.findOne({ where: { name: data.role } });
  if (!role) throw AppError.badRequest(`Unknown role: ${data.role}`);

  let department = null;
  if (data.departmentId) {
    department = await Department.findByPk(data.departmentId);
    if (!department) throw AppError.notFound('Department not found');
  }

  return sequelize.transaction(async (transaction) => {
    const account = await User.create(
      {
        firstName: data.firstName,
        lastName: data.lastName ?? null,
        email,
        phone: data.phone ?? null,
        passwordHash: await hashPassword(data.password),
        roleId: role.id,
        status: data.status || USER_STATUS.ACTIVE,
        employeeId: data.employeeId ?? null,
        gender: data.gender ?? null,
        address: data.address ?? null,
        createdBy: actor?.id ?? null,
      },
      { transaction },
    );

    if (department) {
      await DepartmentStaff.create(
        {
          departmentId: department.id,
          userId: account.id,
          roleInDepartment: data.roleInDepartment || role.name,
          isPrimary: true,
          assignedBy: actor?.id ?? null,
        },
        { transaction },
      );
    }

    await createProfileForRole({ account, role, department, data, transaction });

    await notificationService.notify({
      userIds: [account.id],
      type: 'SYSTEM',
      title: 'Account created',
      message: `Welcome to the hospital platform. Your role is ${role.name}.`,
      data: { role: role.name },
    });

    const fresh = await User.findByPk(account.id, {
      attributes: SAFE_ATTRIBUTES,
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        { model: Department, as: 'assignedDepartments', attributes: ['id', 'name', 'code'], through: { attributes: [] } },
      ],
    });

    return present(fresh);
  });
}

/** Creates the doctor / nurse / staff profile that matches the assigned role. */
async function createProfileForRole({ account, role, department, data, transaction }) {
  const departmentId = department?.id ?? data.departmentId ?? null;

  if (role.name === 'DOCTOR') {
    await Doctor.create(
      {
        userId: account.id,
        departmentId,
        specialization: data.specialization || 'General Practice',
        subSpecialization: data.subSpecialization ?? null,
        licenseNumber: data.licenseNumber || `MD/${account.id}`,
        qualification: data.qualification ?? null,
        yearsOfExperience: data.yearsOfExperience ?? null,
        consultationFee: data.consultationFee ?? 0,
        slotDurationMinutes: data.slotDurationMinutes ?? 30,
        isAcceptingAppointments: true,
        isOnDuty: data.isOnDuty ?? true,
        availability: data.availability ?? null,
        createdBy: account.id,
      },
      { transaction },
    );
    return;
  }

  if (role.name === 'NURSE') {
    await Nurse.create(
      {
        userId: account.id,
        departmentId,
        qualification: data.qualification ?? null,
        registrationNumber: data.registrationNumber ?? null,
        specialization: data.specialization ?? null,
        shift: data.shift || 'DAY',
        isOnDuty: true,
        createdBy: account.id,
      },
      { transaction },
    );
    return;
  }

  await Staff.create(
    {
      userId: account.id,
      departmentId,
      staffType: data.staffType || staffTypeForRole(role.name),
      jobTitle: data.jobTitle ?? null,
      employeeNumber: data.employeeNumber ?? account.employeeId ?? null,
      dateEmployed: data.dateEmployed ?? null,
      createdBy: account.id,
    },
    { transaction },
  );
}

const ROLE_STAFF_TYPE = {
  PHARMACIST: 'PHARMACIST',
  LAB_TECHNICIAN: 'LAB_TECHNICIAN',
  RADIOLOGIST: 'RADIOLOGIST',
  RECEPTIONIST: 'RECEPTIONIST',
  ACCOUNTANT: 'ACCOUNTANT',
};

function staffTypeForRole(roleName) {
  return ROLE_STAFF_TYPE[roleName] || STAFF_TYPES.ADMINISTRATIVE;
}

async function update({ actor, id, data }) {
  const account = await User.findByPk(id, { include: [{ model: Role, as: 'role' }] });
  if (!account) throw AppError.notFound('Staff account not found');

  const patch = {};
  ['firstName', 'lastName', 'phone', 'status', 'employeeId', 'gender', 'address', 'avatarUrl'].forEach((field) => {
    if (data[field] !== undefined) patch[field] = data[field];
  });
  if (data.email) patch.email = String(data.email).trim().toLowerCase();
  if (data.password) {
    patch.passwordHash = await hashPassword(data.password);
    patch.mustChangePassword = true;
    patch.passwordChangedAt = new Date();
  }

  await account.update(patch);

  if (data.role && data.role !== roleNameOf(account)) {
    await changeRole({ actor, userId: id, roleName: data.role, req: actor?.__req });
  }

  // Keep the clinical profile in step with the account.
  const [doctor, nurse, staff] = await Promise.all([
    Doctor.findOne({ where: { userId: id } }),
    Nurse.findOne({ where: { userId: id } }),
    Staff.findOne({ where: { userId: id } }),
  ]);

  if (doctor && data.doctor) await doctor.update(data.doctor);
  if (nurse && data.nurse) await nurse.update(data.nurse);
  if (staff && data.staff) await staff.update(data.staff);

  return getById({ id });
}

/**
 * Role changes are privileged: they rewrite the effective permission set and
 * are always audited.
 */
async function changeRole({ actor, userId, roleName, req }) {
  const account = await User.findByPk(userId, { include: [{ model: Role, as: 'role' }] });
  if (!account) throw AppError.notFound('Staff account not found');

  const previousRole = roleNameOf(account);

  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) throw AppError.badRequest(`Unknown role: ${roleName}`);

  if (account.id === actor?.id) throw AppError.badRequest('You cannot change your own role');

  await account.update({ roleId: role.id });

  // Mirror the new role onto the clinical profile type where applicable.
  if (previousRole === 'DOCTOR' && roleName !== 'DOCTOR') await Doctor.destroy({ where: { userId } });
  if (previousRole === 'NURSE' && roleName !== 'NURSE') await Nurse.destroy({ where: { userId } });
  if (!['DOCTOR', 'NURSE'].includes(roleName)) await Staff.destroy({ where: { userId } });

  await auditService.record({
    user: actor,
    action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
    resource: 'user',
    resourceId: account.id,
    req,
    metadata: { from: previousRole, to: roleName, userEmail: account.email },
  });

  await notificationService.notify({
    userIds: [account.id],
    type: 'SYSTEM',
    title: 'Role updated',
    message: `Your role changed from ${previousRole} to ${roleName}.`,
    data: { from: previousRole, to: roleName },
    priority: 'HIGH',
  });

  return { id: account.id, role: roleName };
}

async function setStatus({ actor, id, status, req }) {
  const account = await User.findByPk(id);
  if (!account) throw AppError.notFound('Staff account not found');
  if (account.id === actor?.id) throw AppError.badRequest('You cannot change the status of your own account');
  await account.update({ status });
  await auditService.record({
    user: actor,
    action: 'USER_STATUS_CHANGED',
    resource: 'user',
    resourceId: account.id,
    req,
    metadata: { status },
  });
  return { id: account.id, status };
}

/** Directory used by pickers (assignment lists, message recipients). */
async function directory({ query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    { status: USER_STATUS.ACTIVE },
    searchWhere(query.search, [['firstName', 'string'], ['lastName', 'string'], ['email', 'string']]),
  );

  /* Association filters live on the includes: Sequelize 6 rejects a nested
   * `role: { name }` object in the top-level `where` of a `findAndCountAll`. */
  const roleInclude = {
    model: Role,
    as: 'role',
    attributes: ['id', 'name'],
    required: true,
    where: { name: query.role ? query.role : { [Op.ne]: ROLES.PATIENT } },
  };

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'roleId'],
    include: [
      roleInclude,
      query.departmentId
        ? {
            model: Department,
            as: 'assignedDepartments',
            attributes: ['id', 'name', 'code'],
            through: { attributes: [] },
            required: true,
            where: { id: query.departmentId },
          }
        : {
            model: Department,
            as: 'assignedDepartments',
            attributes: ['id', 'name', 'code'],
            through: { attributes: [] },
          },
    ],
    order: [['firstName', 'ASC']],
    limit,
    offset,
    distinct: true,
  });

  return {
    staff: rows.map((row) => ({
      ...row.get({ plain: true }),
      fullName: `${row.firstName} ${row.lastName || ''}`.trim(),
      role: row.role ? row.role.name : null,
      departments: (row.assignedDepartments || []).map((d) => ({ id: d.id, name: d.name, code: d.code })),
    })),
    pagination: buildPaginationMeta({ page, limit, total: count }),
  };
}

/** Roles with the permission matrix attached (used by the RBAC screen). */
async function roles() {
  const rows = await Role.findAll({
    order: [['name', 'ASC']],
    include: [{ model: Permission, as: 'permissions', attributes: ['id', 'name', 'resource', 'action'], through: { attributes: [] } }],
  });

  return rows.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isActive: role.isActive,
    permissions: (role.permissions || []).map((p) => p.name).sort(),
  }));
}

/** Only used by tests / permission tooling. */
const _internals = { P, RolePermission, fn, col };

module.exports = {
  list,
  getById,
  create,
  update,
  changeRole,
  setStatus,
  directory,
  roles,
  staffTypeForRole,
  SAFE_ATTRIBUTES,
  SORTABLE,
  _internals,
};