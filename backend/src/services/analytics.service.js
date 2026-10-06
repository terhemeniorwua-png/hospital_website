const { Op, fn, col, literal } = require('sequelize');
const AppError = require('../utils/AppError');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { combineWhere } = require('../utils/queryHelpers');
const { toDateOnly } = require('../utils/dates');
const { round2 } = require('../utils/money');
const { AUDIT_ACTIONS } = require('../config/constants');
const { sequelize } = require('../config/database');
const {
  AuditLog,
  Patient,
  Appointment,
  Admission,
  Invoice,
  Payment,
  Prescription,
  PrescriptionItem,
  Medication,
  LaboratoryOrder,
  ImagingOrder,
  EmergencyCase,
  Message,
  Consultation,
  User,
  Role,
  Department,
  Ward,
  InsuranceClaim,
} = require('../models');

/**
 * Analytics & audit reporting.
 *
 * These are server-renderable charts: counts and aggregates only (no PII-heavy
 * exports). Audit logs are read-only and can be filtered by actor, resource and
 * date. The `toDateOnly` helper keeps the UI's date filters consistent.
 */

function formatRows(rows) {
  return rows.map((row) => Object.fromEntries(Object.keys(row).map((k) => [k, row[k]])));
}

function toYYYYMM(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Overview tiles for the hospital dashboard. */
async function overview({ query = {} }) {
  const day = query.date || toDateOnly();
  const dayStart = new Date(`${day}T00:00:00Z`);
  const dayEnd = new Date(`${day}T23:59:59Z`);

  const monthKey = toYYYYMM(day);

  const [
    patients,
    appointments,
    admissions,
    discharges,
    emergencies,
    invoices,
    collected,
    messages,
    activeConsultations,
    labResultsReady,
    openClaims,
  ] = await Promise.all([
    Patient.count(),
    Appointment.count({ where: { appointmentDate: { [Op.gte]: dayStart } } }),
    Admission.count({ where: { admittedAt: { [Op.gte]: dayStart } } }),
    Admission.count({ where: { dischargedAt: { [Op.between]: [dayStart, dayEnd] } } }),
    EmergencyCase.count({ where: { arrivalAt: { [Op.between]: [dayStart, dayEnd] } } }),
    Invoice.count({ where: { issuedAt: { [Op.between]: [dayStart, dayEnd] } } }),
    Payment.sum('amount', { where: { paidAt: { [Op.between]: [dayStart, dayEnd] }, status: 'SUCCESSFUL' } }),
    Message.count({ where: { createdAt: { [Op.between]: [dayStart, dayEnd] } } }),
    Consultation.count({ where: { status: 'IN_PROGRESS' } }),
    LaboratoryOrder.count({ where: { status: 'COMPLETED', completedAt: { [Op.between]: [dayStart, dayEnd] } } }),
    InsuranceClaim.count({ where: { status: { [Op.in]: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
  ]);

  return {
    date: day,
    month: monthKey,
    patients,
    appointmentsToday: appointments,
    admissionsToday: admissions,
    dischargesToday: discharges,
    emergenciesToday: emergencies,
    invoicesToday: invoices,
    collectedToday: round2(collected || 0),
    messagesToday: messages,
    activeConsultations,
    labResultsReadyToday: labResultsReady,
    openClaims,
  };
}

/** Appointment distribution by day (last 14 days). */
async function appointmentsTrend({ days = 14, departmentId } = {}) {
  const from = new Date();
  from.setDate(from.getDate() - Number(days));
  from.setHours(0, 0, 0, 0);

  const where = combineWhere(
    { appointmentDate: { [Op.gte]: from } },
    departmentId ? { departmentId: Number(departmentId) } : undefined,
  );

  const rows = await Appointment.findAll({
    attributes: ['appointmentDate', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('fee')), 'revenue']],
    where,
    group: ['appointmentDate'],
    order: [['appointmentDate', 'ASC']],
    raw: true,
  });

  return formatRows(rows);
}

/** Beds occupied per ward (live). */
async function bedOccupancy({ wardId } = {}) {
  const where = combineWhere(
    { status: { [Op.in]: ['ADMITTED', 'TRANSFERRED'] } },
    wardId ? { wardId: Number(wardId) } : undefined,
  );

  const [rows, wards] = await Promise.all([
    Admission.findAll({
      attributes: ['wardId', [fn('COUNT', col('Admission.id')), 'occupied']],
      where,
      group: ['wardId'],
      raw: true,
    }),
    Ward.findAll({
      attributes: ['id', 'name', 'code', 'totalBeds'],
      where: wardId ? { id: Number(wardId) } : undefined,
      order: [['name', 'ASC']],
      raw: true,
    }),
  ]);

  const occupiedByWard = new Map(rows.map((row) => [row.wardId, Number(row.occupied)]));

  /* Every ward is returned, including the empty ones, so the dashboard shows
   * utilisation for the whole hospital rather than only occupied wards. */
  return wards.map((ward) => ({
    wardId: ward.id,
    name: ward.name,
    code: ward.code,
    totalBeds: ward.totalBeds,
    occupied: occupiedByWard.get(ward.id) || 0,
  }));
}

/** Billing pipeline over the last 30 days. */
async function revenueByDay({ days = 30 } = {}) {
  const from = new Date();
  from.setDate(from.getDate() - Number(days));
  from.setHours(0, 0, 0, 0);

  const rows = await Payment.findAll({
    attributes: [
      [fn('DATE_TRUNC', 'day', literal('paid_at')), 'day'],
      [fn('SUM', col('amount')), 'collected'],
      [fn('COUNT', col('id')), 'payments'],
    ],
    where: { status: 'SUCCESSFUL', paidAt: { [Op.gte]: from } },
    group: [literal('DATE_TRUNC(\'day\', paid_at)')],
    order: [['day', 'ASC']],
    raw: true,
  });

  return formatRows(rows);
}

/** Department utilisation (completed consultations per department). */
async function departmentUtilisation({ from, to } = {}) {
  const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const end = to ? new Date(to) : new Date();

  const [rows, departments] = await Promise.all([
    Consultation.findAll({
      attributes: ['departmentId', [fn('COUNT', col('Consultation.id')), 'consultations']],
      where: { status: 'COMPLETED', completedAt: { [Op.between]: [start, end] } },
      group: ['departmentId'],
      raw: true,
    }),
    Department.findAll({ attributes: ['id', 'name', 'code'], order: [['name', 'ASC']], raw: true }),
  ]);

  const countsByDepartment = new Map(
    rows.map((row) => [row.departmentId, Number(row.consultations)]),
  );

  return departments.map((department) => ({
    departmentId: department.id,
    name: department.name,
    code: department.code,
    consultations: countsByDepartment.get(department.id) || 0,
  }));
}

/** Top 10 prescribed medications by quantity. */
async function topPrescriptions({ from, to, limit = 10 } = {}) {
  const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const end = to ? new Date(to) : new Date();

  const rows = await PrescriptionItem.findAll({
    attributes: [
      'medicationId',
      [fn('SUM', col('quantity')), 'totalQuantity'],
      [fn('SUM', literal('"PrescriptionItem"."total_price"')), 'totalValue'],
    ],
    include: [
      {
        model: Prescription,
        as: 'prescription',
        attributes: [],
        required: true,
        where: { createdAt: { [Op.between]: [start, end] } },
      },
      { model: Medication, as: 'medication', attributes: ['name', 'code'] },
    ],
    group: ['medicationId', 'medication.id', 'medication.name', 'medication.code'],
    order: [[literal('SUM(quantity)'), 'DESC']],
    limit: Number(limit),
    raw: true,
  });

  return rows.map((row) => ({
    medicationId: row.medicationId,
    name: row['medication.name'],
    code: row['medication.code'],
    totalQuantity: Number(row.totalQuantity),
    totalValue: round2(row.totalValue),
  }));
}

/** Read-only audit log. */
async function auditLog({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const actions = query.action ? String(query.action).split(',').map((s) => s.trim()) : null;
  const resources = query.resource ? String(query.resource).split(',').map((s) => s.trim()) : null;

  const where = combineWhere(
    actions ? { action: { [Op.in]: actions } } : undefined,
    resources ? { resource: { [Op.in]: resources } } : undefined,
    query.userId ? { userId: Number(query.userId) } : undefined,
    query.patientId ? { patientId: Number(query.patientId) } : undefined,
    query.from ? { timestamp: { [Op.gte]: new Date(query.from) } } : undefined,
    query.to ? { timestamp: { [Op.lte]: new Date(query.to) } } : undefined,
    query.ipAddress ? { ipAddress: query.ipAddress } : undefined,
    query.statusCode ? { statusCode: Number(query.statusCode) } : undefined,
  );

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [
      { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'roleId'] },
      { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] },
    ],
    order: [['timestamp', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return { logs: rows.map((row) => row.get({ plain: true })), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

/** Audit summary (counts per action). */
async function auditSummary({ from, to } = {}) {
  const start = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const end = to ? new Date(to) : new Date();

  const rows = await AuditLog.findAll({
    attributes: ['action', [fn('COUNT', col('id')), 'count']],
    where: { timestamp: { [Op.between]: [start, end] } },
    group: ['action'],
    order: [[literal('COUNT(id)'), 'DESC']],
    raw: true,
  });

  const total = rows.reduce((acc, row) => acc + Number(row.count), 0);

  return {
    total,
    period: { from: start, to: end },
    actions: rows.map((row) => ({ action: row.action, count: Number(row.count), pct: total ? Number(((row.count / total) * 100).toFixed(1)) : 0 })),
  };
}

/** Slow requests and failures. */
async function performance({ from, to, limit = 20 } = {}) {
  const start = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const end = to ? new Date(to) : new Date();

  const [slow, failures] = await Promise.all([
    AuditLog.findAll({
      where: {
        timestamp: { [Op.between]: [start, end] },
        durationMs: { [Op.gt]: 500 },
      },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['durationMs', 'DESC']],
      limit: Number(limit),
    }),
    AuditLog.findAll({
      where: {
        timestamp: { [Op.between]: [start, end] },
        statusCode: { [Op.gte]: 400 },
      },
      attributes: ['statusCode', 'path', 'method', [fn('COUNT', col('id')), 'count']],
      group: ['statusCode', 'path', 'method'],
      order: [[literal('COUNT(id)'), 'DESC']],
      limit: Number(limit),
      raw: true,
    }),
  ]);

  return {
    slowRequests: slow.map((row) => row.get({ plain: true })),
    failures: failures.map((row) => ({ statusCode: row.statusCode, path: row.path, method: row.method, count: Number(row.count) })),
  };
}

/** Clinical workload summary. */
async function workload({ from, to } = {}) {
  const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const end = to ? new Date(to) : new Date();

  const [
    consultations,
    prescriptions,
    labOrders,
    imagingOrders,
    admissions,
    discharges,
  ] = await Promise.all([
    Consultation.count({ where: { completedAt: { [Op.between]: [start, end] } } }),
    Prescription.count({ where: { createdAt: { [Op.between]: [start, end] } } }),
    LaboratoryOrder.count({ where: { orderedAt: { [Op.between]: [start, end] } } }),
    ImagingOrder.count({ where: { orderedAt: { [Op.between]: [start, end] } } }),
    Admission.count({ where: { admittedAt: { [Op.between]: [start, end] } } }),
    Admission.count({ where: { dischargedAt: { [Op.between]: [start, end] } } }),
  ]);

  return { consultations, prescriptions, labOrders, imagingOrders, admissions, discharges, period: { from: start, to: end } };
}

module.exports = {
  overview,
  appointmentsTrend,
  bedOccupancy,
  revenueByDay,
  departmentUtilisation,
  topPrescriptions,
  auditLog,
  auditSummary,
  performance,
  workload,
  AUDIT_ACTIONS,
};
