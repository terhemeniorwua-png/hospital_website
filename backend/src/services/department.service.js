const { Op, fn, col } = require('sequelize');
const AppError = require('../utils/AppError');
const { getPagination, getSort, buildPaginationMeta, withSortable } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { roleNameOf } = require('../utils/accessControl');
const { Department, DepartmentStaff, User, Doctor, Nurse, Appointment, Bed, QueueEntry } = require('../models');

/**
 * Hospital departments: the organisational backbone every other module hangs
 * off (appointments, queues, wards, billing all reference a department).
 */

const SORTABLE = withSortable(['name', 'code', 'createdAt', 'updatedAt'], ['isActive']);

const DEPT_FIELDS = ['name', 'code', 'description', 'phone', 'email', 'location', 'isEmergency', 'isActive'];

async function list({ query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const order = getSort(query, SORTABLE, [['name', 'ASC']]);

  const where = combineWhere(
    query.isActive === undefined ? undefined : { isActive: query.isActive },
    query.isEmergency === undefined ? undefined : { isEmergency: query.isEmergency },
    searchWhere(query.search, [['name', 'string'], ['code', 'string'], ['location', 'string']]),
  );

  const { rows, count } = await Department.findAndCountAll({ where, order, limit, offset });

  return { departments: rows.map((d) => d.get({ plain: true })), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

async function getById({ id }) {
  const department = await Department.findByPk(id, {
    include: [
      { model: Doctor, as: 'doctors', attributes: ['id', 'specialization', 'licenseNumber', 'consultationFee'] },
      { model: Nurse, as: 'nurses', attributes: ['id', 'specialization', 'shift'] },
      { model: DepartmentStaff, as: 'assignments', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'status'] }] },
    ],
  });
  if (!department) throw AppError.notFound('Department not found');
  return department.get({ plain: true });
}

async function create({ user, data }) {
  const code = String(data.code || '').trim().toUpperCase();
  if (!code) throw AppError.badRequest('Department code is required');

  const existing = await Department.findOne({ where: { code } });
  if (existing) throw AppError.conflict(`Department code ${code} is already in use`);

  const payload = { code };
  DEPT_FIELDS.forEach((field) => {
    if (field !== 'code' && data[field] !== undefined) payload[field] = data[field];
  });

  const department = await Department.create(payload);
  return { ...department.get({ plain: true }), createdBy: user?.id ?? null };
}

async function update({ id, data }) {
  const department = await Department.findByPk(id);
  if (!department) throw AppError.notFound('Department not found');

  const payload = {};
  DEPT_FIELDS.forEach((field) => {
    if (data[field] !== undefined) payload[field] = data[field];
  });
  if (data.code) {
    const code = String(data.code).trim().toUpperCase();
    const clash = await Department.findOne({ where: { code, id: { [Op.ne]: department.id } } });
    if (clash) throw AppError.conflict(`Department code ${code} is already in use`);
    payload.code = code;
  }

  await department.update(payload);
  return department.get({ plain: true });
}

async function remove({ id }) {
  const department = await Department.findByPk(id);
  if (!department) throw AppError.notFound('Department not found');

  const [doctors, appointments, beds] = await Promise.all([
    Doctor.count({ where: { departmentId: department.id } }),
    Appointment.count({ where: { departmentId: department.id } }),
    Bed.count({ where: { wardId: { [Op.ne]: null }, departmentId: department.id } }),
  ]);

  if (doctors || appointments) {
    throw AppError.conflict('Department still has doctors or appointments. Deactivate it instead.');
  }
  if (beds) throw AppError.conflict('Department still has wards/beds attached.');

  await department.destroy();
  return { removed: true };
}

/* ------------------------------------------------------------------ *
 * Staffing
 * ------------------------------------------------------------------ */

async function assignStaff({ departmentId, userId, roleInDepartment, isPrimary, assignedBy }) {
  const [department, target] = await Promise.all([Department.findByPk(departmentId), User.findByPk(userId)]);
  if (!department) throw AppError.notFound('Department not found');
  if (!target) throw AppError.notFound('User not found');

  const [assignment] = await DepartmentStaff.findOrCreate({
    where: { departmentId, userId },
    defaults: {
      departmentId,
      userId,
      roleInDepartment: roleInDepartment || null,
      isPrimary: Boolean(isPrimary),
      assignedBy: assignedBy ?? null,
    },
  });

  if (roleInDepartment !== undefined || isPrimary !== undefined) {
    await assignment.update({
      roleInDepartment: roleInDepartment ?? assignment.roleInDepartment,
      isPrimary: isPrimary === undefined ? assignment.isPrimary : Boolean(isPrimary),
    });
  }

  return assignment.get({ plain: true });
}

async function removeStaff({ departmentId, userId }) {
  const removed = await DepartmentStaff.destroy({ where: { departmentId, userId } });
  if (!removed) throw AppError.notFound('Assignment not found');
  return { removed: true };
}

async function listStaff({ departmentId, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const where = combineWhere(
    departmentId ? { departmentId: Number(departmentId) } : undefined,
    searchWhere(query.search, [['userFirstName', 'string'], ['userLastName', 'string'], ['userEmail', 'string']]),
  );

  const { rows, count } = await DepartmentStaff.findAndCountAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'status'] }],
    order: [['id', 'ASC']],
    limit,
    offset,
    distinct: true,
  });

  const staff = rows.map((row) => ({
    id: row.id,
    departmentId: row.departmentId,
    roleInDepartment: row.roleInDepartment,
    isPrimary: row.isPrimary,
    user: row.user ? row.user.get({ plain: true }) : null,
  }));

  return { staff, pagination: buildPaginationMeta({ page, limit, total: count }) };
}

/* ------------------------------------------------------------------ *
 * Statistics
 * ------------------------------------------------------------------ */

async function statistics({ id, from, to }) {
  const department = await Department.findByPk(id);
  if (!department) throw AppError.notFound('Department not found');

  const dateFilter = from || to ? { appointmentDate: { ...(from ? { [Op.gte]: from } : {}), ...(to ? { [Op.lte]: to } : {}) } } : undefined;

  const [doctors, nurses, staffCount, appointments, completed, waiting, revenue] = await Promise.all([
    Doctor.count({ where: { departmentId: department.id } }),
    Nurse.count({ where: { departmentId: department.id } }),
    DepartmentStaff.count({ where: { departmentId: department.id } }),
    Appointment.count({ where: combineWhere({ departmentId: department.id }, dateFilter) }),
    Appointment.count({
      where: combineWhere({ departmentId: department.id, status: 'COMPLETED' }, dateFilter),
    }),
    QueueEntry.count({
      where: combineWhere({ departmentId: department.id, status: { [Op.in]: ['WAITING', 'CALLED'] } }),
    }),
    Appointment.sum('fee', { where: combineWhere({ departmentId: department.id, status: 'COMPLETED' }, dateFilter) }),
  ]);

  const byStatus = await Appointment.findAll({
    where: combineWhere({ departmentId: department.id }, dateFilter),
    attributes: ['status', [fn('COUNT', col('id')), 'count']],
    group: ['status'],
    raw: true,
  });

  return {
    department: { id: department.id, name: department.name, code: department.code },
    headcount: { doctors, nurses, assignedStaff: staffCount },
    appointments: {
      total: appointments,
      completed,
      completionRate: appointments ? Number(((completed / appointments) * 100).toFixed(1)) : 0,
      waitingInQueue: waiting,
      byStatus: byStatus.reduce((acc, row) => ({ ...acc, [row.status]: Number(row.count) }), {}),
    },
    revenue: Number(revenue || 0),
  };
}

/** Hospital-wide department roll-up, used by the admin dashboard. */
async function overview() {
  const rows = await Department.findAll({ order: [['name', 'ASC']] });

  const counts = await Department.findAll({
    attributes: ['id', [fn('COUNT', col('doctors.id')), 'doctorCount']],
    include: [{ model: Doctor, as: 'doctors', attributes: [] }],
    group: ['Department.id'],
    raw: true,
  });

  const countMap = new Map(counts.map((row) => [row.id, Number(row.doctorCount)]));

  return {
    departments: rows.map((department) => ({
      id: department.id,
      name: department.name,
      code: department.code,
      isEmergency: department.isEmergency,
      isActive: department.isActive,
      doctors: countMap.get(department.id) || 0,
    })),
    total: rows.length,
    canManage: true,
  };
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  assignStaff,
  removeStaff,
  listStaff,
  statistics,
  overview,
  SORTABLE,
  canManage: (user) => ['SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(roleNameOf(user)),
};