const { Op, fn, col, literal } = require('sequelize');
const AppError = require('../utils/AppError');
const { sequelize } = require('../config/database');
const { getPagination, getSort, buildPaginationMeta, withSortable } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { numbered } = require('../utils/codeGenerator');
const { round2 } = require('../utils/money');
const { isClinicalStaff, roleNameOf } = require('../utils/accessControl');
const { LAB_ORDER_STATUS, MEDICAL_RECORD_TYPES } = require('../config/constants');
const { EVENTS } = require('../realtime/events');
const realtime = require('../realtime/socket');
const notificationService = require('./notification.service');
const medicalRecordService = require('./medicalRecord.service');
const { sameId } = require('../utils/ids');
const {
  LaboratoryOrder,
  LaboratoryOrderItem,
  LaboratoryResult,
  LaboratoryTest,
  Patient,
  User,
  Doctor,
  Consultation,
} = require('../models');

/**
 * Laboratory workflow:
 *
 *   ORDERED -> SAMPLE_COLLECTED -> PROCESSING -> COMPLETED
 *
 * Results are entered by lab technicians and must be *published* before the
 * ordering doctor (and the patient) are notified - publication is the audit
 * point.
 */

const SORTABLE = withSortable(['orderedAt', 'completedAt', 'status', 'orderNumber', 'createdAt']);

const ORDER_INCLUDES = [
  { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName', 'gender', 'dateOfBirth'] },
  { model: User, as: 'orderedByUser', attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: Consultation, as: 'consultation', attributes: ['id', 'consultationNumber'] },
];

function present(order) {
  if (!order) return null;
  const plain = order.get({ plain: true });
  return {
    ...plain,
    patientName: plain.patient ? `${plain.patient.firstName} ${plain.patient.lastName || ''}`.trim() : null,
  };
}

/* ------------------------------------------------------------------ *
 * Catalogue
 * ------------------------------------------------------------------ */

async function listTests({ query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    query.isActive === undefined ? { isActive: true } : { isActive: query.isActive },
    query.category ? { category: query.category } : undefined,
    searchWhere(query.search, [['code', 'string'], ['name', 'string'], ['specimen', 'string']]),
  );

  const { rows, count } = await LaboratoryTest.findAndCountAll({
    where,
    order: [['category', 'ASC'], ['name', 'ASC']],
    limit,
    offset,
  });

  return {
    tests: rows.map((row) => row.get({ plain: true })),
    pagination: buildPaginationMeta({ page, limit, total: count }),
  };
}

async function getTest({ id }) {
  const test = await LaboratoryTest.findByPk(id);
  if (!test) throw AppError.notFound('Laboratory test not found');
  return test.get({ plain: true });
}

/* ------------------------------------------------------------------ *
 * Orders
 * ------------------------------------------------------------------ */

function scopeFor(user) {
  if (roleNameOf(user) === 'PATIENT') return { patientId: user.patientId ?? -1 };
  return undefined;
}

async function listOrders({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const order = getSort(query, SORTABLE, [['orderedAt', 'DESC']]);
  const statuses = query.status ? String(query.status).split(',').map((s) => s.trim()) : null;

  const where = combineWhere(
    scopeFor(user),
    statuses ? { status: { [Op.in]: statuses } } : undefined,
    query.patientId ? { patientId: query.patientId } : undefined,
    query.priority ? { priority: query.priority } : undefined,
    query.unpublished === true ? { status: { [Op.in]: ['PROCESSING', 'COMPLETED'] } } : undefined,
    query.date ? { orderedAt: { [Op.gte]: new Date(`${query.date}T00:00:00Z`) } } : undefined,
    searchWhere(query.search, [['orderNumber', 'string'], ['clinicalNotes', 'string']]),
  );

  const { rows, count } = await LaboratoryOrder.findAndCountAll({
    where,
    include: ORDER_INCLUDES,
    order,
    limit,
    offset,
    distinct: true,
  });

  return { orders: rows.map(present), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

async function getOrder({ user, id }) {
  const order = await LaboratoryOrder.findByPk(id, { include: ORDER_INCLUDES });
  if (!order) throw AppError.notFound('Laboratory order not found');
  if (roleNameOf(user) === 'PATIENT' && !sameId(order.patientId, user.patientId)) {
    throw AppError.forbidden('You are not authorised to view this laboratory order');
  }

  const items = await LaboratoryOrderItem.findAll({
    where: { orderId: order.id },
    include: [
      { model: LaboratoryResult, as: 'result', required: false },
      { model: LaboratoryTest, as: 'test', attributes: ['id', 'code', 'name', 'unit', 'specimen', 'referenceRangeText', 'method'] },
    ],
    order: [['id', 'ASC']],
  });

  return {
    ...present(order),
    items: items.map((item) => ({
      ...item.get({ plain: true }),
      result: item.result ? item.result.get({ plain: true }) : null,
    })),
  };
}

async function nextOrderNumber({ transaction }) {
  const last = await LaboratoryOrder.findOne({ order: [['id', 'DESC']], attributes: ['orderNumber'], transaction });
  let sequence = 1;
  if (last && typeof last.orderNumber === 'string') {
    const parsed = Number.parseInt(last.orderNumber.split('-').pop(), 10);
    if (Number.isFinite(parsed)) sequence = parsed + 1;
  }
  return numbered('LAB', sequence);
}

/**
 * Creates an order with its items in one transaction. Item prices come from the
 * catalogue - the client never supplies them.
 */
async function createOrder({ user, data }) {
  if (!isClinicalStaff(user)) throw AppError.forbidden('Only clinical staff may request laboratory tests');

  const patient = await Patient.findByPk(data.patientId);
  if (!patient) throw AppError.notFound('Patient not found');

  const tests = await LaboratoryTest.findAll({
    where: { id: { [Op.in]: data.testIds.map(String) }, isActive: true },
  });
  if (!tests.length) throw AppError.badRequest('None of the requested tests exist or are active');
  if (tests.length !== data.testIds.length) {
    throw AppError.badRequest('One or more requested tests are unavailable');
  }

  const departmentId = data.departmentId ?? null;

  const order = await sequelize.transaction(async (transaction) => {
    const created = await LaboratoryOrder.create(
      {
        orderNumber: await nextOrderNumber({ transaction }),
        patientId: patient.id,
        consultationId: data.consultationId ?? null,
        admissionId: data.admissionId ?? null,
        orderedBy: user.id,
        departmentId,
        status: LAB_ORDER_STATUS.ORDERED,
        priority: data.priority || 'ROUTINE',
        clinicalNotes: data.clinicalNotes ?? null,
        totalPrice: round2(tests.reduce((sum, test) => sum + Number(test.price || 0), 0)),
        isBilled: false,
        orderedAt: new Date(),
      },
      { transaction },
    );

    await LaboratoryOrderItem.bulkCreate(
      tests.map((test) => ({
        orderId: created.id,
        laboratoryTestId: test.id,
        testCode: test.code,
        testName: test.name,
        price: test.price,
        status: 'PENDING',
      })),
      { transaction },
    );

    return created;
  });

  const full = await LaboratoryOrder.findByPk(order.id, { include: ORDER_INCLUDES });

  await medicalRecordService.append({
    user,
    patientId: patient.id,
    recordType: MEDICAL_RECORD_TYPES.LAB_RESULT,
    title: `Laboratory order ${order.orderNumber}`,
    summary: `${tests.length} test(s) requested`,
    referenceType: 'laboratory_order',
    referenceId: order.id,
    consultationId: data.consultationId ?? null,
    departmentId,
    occurredAt: order.orderedAt,
  });

  await notificationService.notify({
    role: 'LAB_TECHNICIAN',
    type: 'LABORATORY',
    title: `New laboratory order ${order.orderNumber}`,
    message: `${tests.length} test(s) ordered for ${patient.getFullName()}.`,
    data: { orderId: order.id, patientId: patient.id },
    priority: data.priority === 'STAT' ? 'URGENT' : 'NORMAL',
  });

  realtime.emitToHospital(EVENTS.LAB_ORDER_STATUS, { orderId: order.id, status: order.status });

  return getOrder({ user, id: order.id });
}

const TRANSITIONS = {
  ORDERED: ['SAMPLE_COLLECTED', 'CANCELLED'],
  SAMPLE_COLLECTED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

async function updateOrderStatus({ user, id, status, reason }) {
  const order = await LaboratoryOrder.findByPk(id);
  if (!order) throw AppError.notFound('Laboratory order not found');

  const allowed = TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    throw AppError.conflict(`Cannot change a laboratory order from ${order.status} to ${status}`);
  }

  const patch = { status };
  const now = new Date();
  if (status === 'SAMPLE_COLLECTED') {
    patch.sampleCollectedAt = now;
    patch.sampleCollectedBy = user.id;
  }
  if (status === 'PROCESSING') patch.startedAt = now;
  if (status === 'COMPLETED') patch.completedAt = now;
  if (status === 'CANCELLED') {
    patch.cancelledAt = now;
    patch.cancelReason = reason || 'Cancelled';
  }

  await sequelize.transaction(async (transaction) => {
    await order.update(patch, { transaction });
    const nextItemStatus =
      status === 'SAMPLE_COLLECTED' ? 'SAMPLE_COLLECTED' : status === 'PROCESSING' ? 'PROCESSING' : null;
    if (nextItemStatus) {
      await LaboratoryOrderItem.update(
        { status: nextItemStatus },
        { where: { orderId: order.id, status: 'PENDING' }, transaction },
      );
    }
  });

  realtime.emitToHospital(EVENTS.LAB_ORDER_STATUS, { orderId: order.id, status });

  return getOrder({ user: user.id, id: order.id });
}

/* ------------------------------------------------------------------ *
 * Results
 * ------------------------------------------------------------------ */

/** Flags a numeric value against the test's reference range. */
function computeFlag(test, numericValue) {
  if (numericValue === null || numericValue === undefined || !Number.isFinite(Number(numericValue))) return 'NORMAL';
  const value = Number(numericValue);
  if (test.criticalLow !== null && test.criticalLow !== undefined && value < Number(test.criticalLow)) return 'CRITICAL_LOW';
  if (test.criticalHigh !== null && test.criticalHigh !== undefined && value > Number(test.criticalHigh)) return 'CRITICAL_HIGH';
  if (test.referenceRangeMin !== null && test.referenceRangeMin !== undefined && value < Number(test.referenceRangeMin)) return 'LOW';
  if (test.referenceRangeMax !== null && test.referenceRangeMax !== undefined && value > Number(test.referenceRangeMax)) return 'HIGH';
  return 'NORMAL';
}

const referenceRangeOf = (test) =>
  test.referenceRangeText ||
  (test.referenceRangeMin !== null || test.referenceRangeMax !== null
    ? `${test.referenceRangeMin ?? '-'} - ${test.referenceRangeMax ?? '-'}`
    : null);

/** Records one result (draft). */
async function recordResult({ user, orderId, data }) {
  const order = await LaboratoryOrder.findByPk(orderId);
  if (!order) throw AppError.notFound('Laboratory order not found');
  if (!['SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED'].includes(order.status)) {
    throw AppError.conflict('Collect the sample before recording results');
  }

  const item = await LaboratoryOrderItem.findByPk(data.orderItemId);
  if (!item || !sameId(item.orderId, order.id)) {
    throw AppError.notFound('Test item not found on this order');
  }

  const test = await LaboratoryTest.findByPk(item.laboratoryTestId);
  const numeric = data.numericValue !== undefined && data.numericValue !== null ? Number(data.numericValue) : null;

  const payload = {
    orderId: order.id,
    orderItemId: item.id,
    laboratoryTestId: item.laboratoryTestId,
    patientId: order.patientId,
    resultValue: data.resultValue ?? (numeric === null ? null : String(numeric)),
    numericValue: Number.isFinite(numeric) ? numeric : null,
    unit: data.unit ?? test?.unit ?? null,
    referenceRange: data.referenceRange ?? referenceRangeOf(test) ?? null,
    flag: data.flag ?? computeFlag(test, numeric),
    technicianNotes: data.technicianNotes ?? null,
    performedBy: user.id,
    performedAt: new Date(),
    isPublished: false,
  };

  const existing = await LaboratoryResult.findOne({ where: { orderItemId: item.id } });
  const result = existing || await LaboratoryResult.create({ ...payload, orderItemId: item.id });
  if (existing) await result.update(payload);
  await item.update({ status: 'COMPLETED' });

  // Move the order forward automatically when every item is done.
  const remaining = await LaboratoryOrderItem.count({
    where: { orderId: order.id, status: { [Op.ne]: 'COMPLETED' } },
  });
  if (remaining === 0 && order.status !== 'COMPLETED') {
    await order.update({ status: LAB_ORDER_STATUS.COMPLETED, completedAt: new Date() });
  } else if (order.status === 'ORDERED') {
    await order.update({ status: LAB_ORDER_STATUS.PROCESSING, startedAt: new Date() });
  }

  return result.get({ plain: true });
}

/**
 * Publishes results: this is the moment the ordering doctor and the patient are
 * notified. Published results become immutable except by an admin re-publish.
 */
async function publishResults({ user, orderId }) {
  const order = await LaboratoryOrder.findByPk(orderId);
  if (!order) throw AppError.notFound('Laboratory order not found');

  const results = await LaboratoryResult.findAll({ where: { orderId: order.id } });
  if (!results.length) throw AppError.conflict('There are no results to publish');

  const unpublished = results.filter((result) => !result.isPublished);
  if (!unpublished.length) throw AppError.conflict('All results on this order are already published');

  const now = new Date();
  await sequelize.transaction(async (transaction) => {
    await LaboratoryResult.update(
      { isPublished: true, publishedAt: now, publishedBy: user.id },
      { where: { orderId: order.id, isPublished: false }, transaction },
    );
    await LaboratoryOrderItem.update(
      { status: 'COMPLETED' },
      { where: { orderId: order.id, status: { [Op.ne]: 'CANCELLED' } }, transaction },
    );
    await LaboratoryOrder.update(
      { status: LAB_ORDER_STATUS.COMPLETED, completedAt: now },
      { where: { id: order.id }, transaction },
    );
  });

  await medicalRecordService.append({
    user,
    patientId: order.patientId,
    recordType: MEDICAL_RECORD_TYPES.LAB_RESULT,
    title: `Laboratory results ${order.orderNumber}`,
    summary: `${results.length} result(s) published`,
    referenceType: 'laboratory_order',
    referenceId: order.id,
    consultationId: order.consultationId,
    departmentId: order.departmentId,
    occurredAt: now,
  });

  const critical = results.filter((r) => ['CRITICAL_LOW', 'CRITICAL_HIGH'].includes(r.flag));

  await notificationService.notify({
    userIds: order.orderedBy ? [order.orderedBy] : [],
    patientId: order.patientId,
    type: 'LABORATORY',
    title: `Laboratory results ready (${order.orderNumber})`,
    message: critical.length
      ? `${critical.length} result(s) for ${order.orderNumber} are outside the safe range.`
      : `Results for order ${order.orderNumber} have been published.`,
    data: { orderId: order.id, orderNumber: order.orderNumber, critical: critical.length },
    priority: critical.length ? 'URGENT' : 'NORMAL',
    actionUrl: `/laboratory/orders/${order.id}`,
  });

  const payload = { orderId: order.id, orderNumber: order.orderNumber, patientId: order.patientId, results: results.length };
  realtime.emitToPatient(order.patientId, EVENTS.LAB_RESULT_READY, payload);
  if (order.departmentId) realtime.emitToDepartment(order.departmentId, EVENTS.LAB_RESULT_READY, payload);
  realtime.emitToHospital(EVENTS.LAB_RESULT_READY, payload);

  return getOrder({ user, id: order.id });
}

/** Results a patient may see: published only. */
async function listResults({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    scopeFor(user),
    roleNameOf(user) === 'PATIENT' ? { isPublished: true } : query.published === undefined ? undefined : { isPublished: query.published },
    query.patientId ? { patientId: query.patientId } : undefined,
    query.orderId ? { orderId: query.orderId } : undefined,
    query.flag ? { flag: query.flag } : undefined,
  );

  const { rows, count } = await LaboratoryResult.findAndCountAll({
    where,
    include: [{ model: LaboratoryTest, as: 'test', attributes: ['id', 'code', 'name', 'unit', 'category'] }],
    order: [['performedAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return { results: rows.map((row) => row.get({ plain: true })), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

async function statistics({ query = {} }) {
  const where = {};
  if (query.date) where.orderedAt = { [Op.gte]: new Date(`${query.date}T00:00:00Z`) };

  const [byStatus, totals] = await Promise.all([
    LaboratoryOrder.findAll({
      where,
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),
    LaboratoryOrder.findAll({
      where,
      attributes: [
        [fn('COUNT', col('id')), 'total'],
        [fn('COALESCE', fn('SUM', literal('total_price')), 0), 'value'],
      ],
      raw: true,
    }),
  ]);

  const counts = byStatus.reduce((acc, row) => ({ ...acc, [row.status]: Number(row.count) }), {});

  return {
    pending: (counts.ORDERED || 0) + (counts.SAMPLE_COLLECTED || 0),
    processing: counts.PROCESSING || 0,
    completed: counts.COMPLETED || 0,
    cancelled: counts.CANCELLED || 0,
    byStatus: counts,
    totalValue: Number(totals[0]?.value || 0),
  };
}

module.exports = {
  listTests,
  getTest,
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  recordResult,
  publishResults,
  listResults,
  statistics,
  computeFlag,
  referenceRangeOf,
  present,
  TRANSITIONS,
  SORTABLE,
  nextOrderNumber,
};