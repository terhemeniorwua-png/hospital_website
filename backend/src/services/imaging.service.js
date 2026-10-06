const { Op } = require('sequelize');
const AppError = require('../utils/AppError');
const { numbered } = require('../utils/codeGenerator');
const { isClinicalStaff, roleNameOf } = require('../utils/accessControl');
const { MEDICAL_RECORD_TYPES } = require('../config/constants');
const { EVENTS } = require('../realtime/events');
const realtime = require('../realtime/socket');
const notificationService = require('./notification.service');
const medicalRecordService = require('./medicalRecord.service');
const { getPagination, getSort, buildPaginationMeta, withSortable } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { ImagingOrder, Patient, User, Consultation } = require('../models');

/**
 * Imaging requests and radiology reports.
 * Ordering follows the same authority rules as laboratory requests.
 */

const SORTABLE = withSortable(['orderedAt', 'performedAt', 'status', 'orderNumber', 'createdAt']);

const IMAGING_INCLUDES = [
  { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName', 'gender', 'dateOfBirth'] },
  { model: User, as: 'orderedByUser', attributes: ['id', 'firstName', 'lastName'] },
  { model: Consultation, as: 'consultation', attributes: ['id', 'consultationNumber'] },
];

const TRANSITIONS = {
  ORDERED: ['SCHEDULED', 'IN_PROGRESS', 'CANCELLED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function present(order) {
  if (!order) return null;
  const plain = order.get({ plain: true });
  return {
    ...plain,
    patientName: plain.patient ? `${plain.patient.firstName} ${plain.patient.lastName || ''}`.trim() : null,
  };
}

async function list({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const order = getSort(query, SORTABLE, [['orderedAt', 'DESC']]);
  const statuses = query.status ? String(query.status).split(',').map((s) => s.trim()) : null;

  const where = combineWhere(
    roleNameOf(user) === 'PATIENT' ? { patientId: user.patientId ?? -1 } : undefined,
    statuses ? { status: { [Op.in]: statuses } } : undefined,
    query.patientId ? { patientId: Number(query.patientId) } : undefined,
    query.priority ? { priority: query.priority } : undefined,
    searchWhere(query.search, [['orderNumber', 'string'], ['imagingType', 'string'], ['bodyPart', 'string']]),
  );

  const { rows, count } = await ImagingOrder.findAndCountAll({
    where,
    include: IMAGING_INCLUDES,
    order,
    limit,
    offset,
    distinct: true,
  });

  // A patient may only see reports that have been published.
  const safe = roleNameOf(user) === 'PATIENT' ? rows.map((row) => redactUnpublished(row)) : rows;

  return { orders: safe.map(present), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

function redactUnpublished(row) {
  if (row.isPublished) return row;
  const plain = row.get({ plain: true });
  return { ...plain, findings: null, report: null };
}

async function getById({ user, id }) {
  const order = await ImagingOrder.findByPk(id, { include: IMAGING_INCLUDES });
  if (!order) throw AppError.notFound('Imaging order not found');
  if (roleNameOf(user) === 'PATIENT') {
    if (Number(order.patientId) !== Number(user.patientId)) {
      throw AppError.forbidden('You are not authorised to view this imaging report');
    }
    return present(redactUnpublished(order));
  }
  return present(order);
}

async function nextOrderNumber({ transaction }) {
  const last = await ImagingOrder.findOne({ order: [['id', 'DESC']], attributes: ['orderNumber'], transaction });
  let sequence = 1;
  if (last && typeof last.orderNumber === 'string') {
    const parsed = Number.parseInt(last.orderNumber.split('-').pop(), 10);
    if (Number.isFinite(parsed)) sequence = parsed + 1;
  }
  return numbered('IMG', sequence);
}

async function create({ user, data }) {
  if (!isClinicalStaff(user)) throw AppError.forbidden('Only clinical staff may request imaging');

  const patient = await Patient.findByPk(data.patientId);
  if (!patient) throw AppError.notFound('Patient not found');

  const created = await ImagingOrder.create({
    orderNumber: await nextOrderNumber({}),
    patientId: patient.id,
    consultationId: data.consultationId ?? null,
    admissionId: data.admissionId ?? null,
    orderedBy: user.id,
    imagingType: data.imagingType,
    bodyPart: data.bodyPart ?? null,
    priority: data.priority || 'ROUTINE',
    status: 'ORDERED',
    clinicalNotes: data.clinicalNotes ?? null,
    price: data.price ?? 0,
    isBilled: false,
    orderedAt: new Date(),
  });

  await medicalRecordService.append({
    user,
    patientId: patient.id,
    recordType: MEDICAL_RECORD_TYPES.IMAGING,
    title: `Imaging request ${created.orderNumber}`,
    summary: `${data.imagingType}${data.bodyPart ? ` - ${data.bodyPart}` : ''}`,
    referenceType: 'imaging_order',
    referenceId: created.id,
    consultationId: data.consultationId ?? null,
    occurredAt: created.orderedAt,
  });

  await notificationService.notify({
    role: 'RADIOLOGIST',
    type: 'LABORATORY',
    title: `Imaging request ${created.orderNumber}`,
    message: `${data.imagingType} requested for ${patient.getFullName()}.`,
    data: { orderId: created.id, patientId: patient.id },
    priority: data.priority === 'STAT' ? 'URGENT' : 'NORMAL',
  });

  return getById({ user, id: created.id });
}

/** Radiologist records findings / the report and marks the study performed. */
async function recordReport({ user, id, data }) {
  const order = await ImagingOrder.findByPk(id);
  if (!order) throw AppError.notFound('Imaging order not found');

  const allowed = TRANSITIONS[order.status] || [];
  if (!allowed.includes('COMPLETED') && order.status !== 'COMPLETED') {
    throw AppError.conflict(`Cannot complete an imaging order in status ${order.status}`);
  }

  await order.update({
    status: data.status || 'COMPLETED',
    findings: data.findings ?? order.findings,
    report: data.report ?? order.report,
    performedBy: user.id,
    performedAt: data.performedAt || new Date(),
    isPublished: Boolean(data.publish),
    publishedAt: data.publish ? new Date() : order.publishedAt,
  });

  if (data.publish) {
    await medicalRecordService.append({
      user,
      patientId: order.patientId,
      recordType: MEDICAL_RECORD_TYPES.IMAGING,
      title: `Imaging report ${order.orderNumber}`,
      summary: data.findings ?? data.report ?? null,
      referenceType: 'imaging_order',
      referenceId: order.id,
      consultationId: order.consultationId,
      occurredAt: order.performedAt,
    });

    await notificationService.notify({
      userIds: order.orderedBy ? [order.orderedBy] : [],
      patientId: order.patientId,
      type: 'LABORATORY',
      title: `Imaging report ready (${order.orderNumber})`,
      message: `The ${order.imagingType} report has been published.`,
      data: { orderId: order.id },
      actionUrl: `/imaging/orders/${order.id}`,
    });

    const payload = { orderId: order.id, orderNumber: order.orderNumber, patientId: order.patientId };
    realtime.emitToPatient(order.patientId, EVENTS.IMAGING_REPORT_READY, payload);
    realtime.emitToHospital(EVENTS.IMAGING_REPORT_READY, payload);
  }

  return getById({ user, id: order.id });
}

async function updateStatus({ user, id, status, reason }) {
  const order = await ImagingOrder.findByPk(id);
  if (!order) throw AppError.notFound('Imaging order not found');

  const allowed = TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    throw AppError.conflict(`Cannot change an imaging order from ${order.status} to ${status}`);
  }

  await order.update({ status, performedBy: status === 'IN_PROGRESS' ? user.id : order.performedBy });
  return getById({ user, id: order.id });
}

module.exports = { list, getById, create, recordReport, updateStatus, present, TRANSITIONS, SORTABLE, nextOrderNumber };