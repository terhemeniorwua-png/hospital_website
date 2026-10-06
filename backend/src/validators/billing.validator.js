const {
  id,
  z,
  booleanish,
  dateOnly,
  dateTime,
  enumOf,
  optionalBooleanish,
  optionalEnumList,
  optionalEnumOf,
  optionalId,
  optionalString,
  optionalText,
  paginationQuery,
} = require('./common');
const { INVOICE_STATUS, PAYMENT_STATUS, BILLING_ITEM_TYPES } = require('../config/constants');

/** Invoice, invoice line and payment contracts. */

/**
 * `status` on a payment is deliberately *not* client-settable for success:
 * the payment service derives it from the recorded payment. A client may only
 * flag a payment as PENDING (e.g. awaiting a bank transfer confirmation) and
 * an authorised staff member later verifies it.
 */
const paymentStatusInput = enumOf([PAYMENT_STATUS.PENDING]);

const lineItem = z.object({
  itemType: enumOf(Object.values(BILLING_ITEM_TYPES)).default('OTHER'),
  description: z.string().trim().min(1, 'A description is required').max(500),
  referenceType: optionalString(40),
  referenceId: id.optional(),
  quantity: z.coerce.number().min(0).max(1_000_000).default(1),
  unitPrice: z.coerce.number().min(0).max(1_000_000_000),
  discountAmount: z.coerce.number().min(0).max(1_000_000_000).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

const create = {
  body: z.object({
    patientId: id,
    admissionId: id.optional(),
    appointmentId: id.optional(),
    items: z.array(lineItem).optional(),
    autoCollect: booleanish.optional(),
    discountAmount: z.coerce.number().min(0).max(1_000_000_000).optional(),
    insuranceAmount: z.coerce.number().min(0).max(1_000_000_000).optional(),
    policyId: id.optional(),
    currency: optionalString(8),
    dueDate: dateTime,
    bedChargesFrom: dateOnly,
    notes: optionalText(2000),
  }),
};

const addItem = { body: lineItem };

const applyDiscount = {
  body: z.object({
    discountAmount: z.coerce.number().min(0).max(1_000_000_000),
    reason: optionalText(500),
  }),
};

const cancel = { body: z.object({ reason: optionalText(500) }) };

const recordPayment = {
  body: z.object({
    invoiceId: id,
    amount: z.coerce.number().gt(0, 'Payment amount must be greater than zero'),
    method: enumOf(['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'INSURANCE', 'WAIVER']),
    status: paymentStatusInput.optional(),
    reference: optionalString(120),
    paidAt: dateTime,
    notes: optionalText(1000),
  }),
};

const refundPayment = {
  body: z.object({
    reason: z.string().trim().min(1, 'A refund reason is required').max(500),
    amount: z.coerce.number().gt(0).optional(),
  }),
};

const list = {
  query: z.object({
    ...paginationQuery,
    patientId: optionalId,
    admissionId: optionalId,
    status: optionalEnumList(Object.values(INVOICE_STATUS)),
    unpaid: optionalBooleanish,
    overdue: optionalBooleanish,
    from: dateOnly,
    to: dateOnly,
  }),
};

const listPayments = {
  query: z.object({
    ...paginationQuery,
    invoiceId: optionalId,
    patientId: optionalId,
    method: optionalEnumOf(['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'INSURANCE', 'WAIVER']),
    status: optionalEnumOf(Object.values(PAYMENT_STATUS)),
    from: dateOnly,
    to: dateOnly,
  }),
};

const statement = { params: z.object({ patientId: id }) };

const statistics = { query: z.object({ date: dateOnly }) };

module.exports = {
  create,
  addItem,
  applyDiscount,
  cancel,
  recordPayment,
  refundPayment,
  list,
  listPayments,
  statement,
  statistics,
  idRoute: { params: z.object({ id: id }) },
  itemRoute: { params: z.object({ id: id, itemId: id }) },
};