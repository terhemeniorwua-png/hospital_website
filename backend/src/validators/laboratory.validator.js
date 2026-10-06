const {
  id,
  z,
  booleanish,
  dateOnly,
  enumOf,
  optionalBooleanish,
  optionalEnumOf,
  optionalId,
  optionalString,
  optionalText,
  paginationQuery,
} = require('./common');
const { LAB_ORDER_STATUS } = require('../config/constants');
const { AUDIT_ACTIONS } = require('../config/constants');

/** Laboratory order / result contracts. */

const createOrder = {
  body: z.object({
    patientId: id,
    testIds: z.array(id).min(1, 'Select at least one test'),
    consultationId: id.optional(),
    admissionId: id.optional(),
    departmentId: id.optional(),
    priority: enumOf(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
    clinicalNotes: optionalText(2000),
  }),
};

const listOrders = {
  query: z.object({
    ...paginationQuery,
    patientId: optionalId,
    consultationId: optionalId,
    status: optionalEnumOf(Object.values(LAB_ORDER_STATUS)),
    priority: optionalEnumOf(['ROUTINE', 'URGENT', 'STAT']),
    date: dateOnly,
    published: optionalBooleanish,
    unpublished: optionalBooleanish,
  }),
};

const updateStatus = {
  body: z.object({
    status: enumOf(Object.values(LAB_ORDER_STATUS)),
    reason: optionalText(500),
  }),
};

const recordResult = {
  body: z.object({
    orderItemId: id,
    resultValue: optionalString(500),
    numericValue: z.coerce.number().optional().nullable(),
    unit: optionalString(40),
    referenceRange: optionalString(120),
    flag: enumOf(['NORMAL', 'LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH']).optional(),
    technicianNotes: optionalText(2000),
  }),
};

const listResults = {
  query: z.object({
    ...paginationQuery,
    patientId: optionalId,
    orderId: optionalId,
    published: optionalBooleanish,
    flag: optionalEnumOf(['NORMAL', 'LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH']),
  }),
};

const listTests = {
  query: z.object({ ...paginationQuery, category: optionalString(80), isActive: optionalBooleanish, search: optionalString(120) }),
};

const statistics = { query: z.object({ date: dateOnly }) };

const idRoute = { params: z.object({ id: id }) };
const testRoute = { params: z.object({ id: id }) };

module.exports = {
  createOrder,
  listOrders,
  updateStatus,
  recordResult,
  listResults,
  listTests,
  statistics,
  idRoute,
  testRoute,
  AUDIT_ACTIONS,
};