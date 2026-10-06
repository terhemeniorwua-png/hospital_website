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
const { PRESCRIPTION_STATUS, INVENTORY_TRANSACTION_TYPES } = require('../config/constants');

/** Prescription + pharmacy inventory contracts. */

const prescriptionItem = z.object({
  medicationId: id,
  dosage: z.string().trim().min(1).max(120),
  frequency: z.string().trim().min(1).max(120),
  duration: optionalString(120),
  route: optionalString(60),
  quantity: z.coerce.number().int().min(1).max(1000),
  instructions: optionalText(500),
});

const createPrescription = {
  body: z.object({
    patientId: id,
    consultationId: id.optional(),
    doctorId: id.optional(),
    notes: optionalText(2000),
    items: z.array(prescriptionItem).min(1, 'A prescription needs at least one medication'),
  }),
};

const updatePrescription = {
  body: z
    .object({
      notes: optionalText(2000),
      pharmacyNotes: optionalText(2000),
      status: enumOf(Object.values(PRESCRIPTION_STATUS)),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be supplied' }),
};

const verify = {
  body: z.object({ pharmacyNotes: optionalText(2000) }),
};

const dispense = {
  body: z.object({
    items: z
      .array(z.object({ itemId: id, quantity: z.coerce.number().int().min(1).max(1000) }))
      .optional(),
    notes: optionalText(2000),
  }),
};

const cancel = {
  body: z.object({ reason: optionalText(500) }),
};

const listPrescriptions = {
  query: z.object({
    ...paginationQuery,
    patientId: optionalId,
    doctorId: optionalId,
    consultationId: optionalId,
    status: optionalEnumOf(Object.values(PRESCRIPTION_STATUS)),
    date: dateOnly,
    unverified: optionalBooleanish,
  }),
};

const restock = {
  body: z.object({
    medicationId: id,
    quantity: z.coerce.number().int().min(1).max(1_000_000),
    batchNumber: z.string().trim().min(1).max(60),
    expiryDate: dateOnly,
    supplierId: id.optional(),
    unitPrice: z.coerce.number().min(0).max(1_000_000).optional(),
    reorderLevel: z.coerce.number().int().min(0).max(1_000_000).optional(),
    shelfLocation: optionalString(60),
    notes: optionalText(500),
  }),
};

const adjust = {
  body: z.object({
    delta: z.coerce.number().refine((value) => value !== 0, 'A non-zero adjustment is required'),
    reason: optionalText(500),
  }),
};

const listMedications = {
  query: z.object({ ...paginationQuery, isActive: optionalBooleanish, search: optionalString(120) }),
};

const listInventory = {
  query: z.object({
    ...paginationQuery,
    medicationId: optionalId,
    supplierId: optionalId,
    batchNumber: optionalString(60),
    lowStock: optionalBooleanish,
    expired: optionalBooleanish,
    expiring: optionalBooleanish,
    search: optionalString(120),
  }),
};

const listTransactions = {
  query: z.object({
    ...paginationQuery,
    medicationId: optionalId,
    transactionType: optionalEnumOf(Object.values(INVENTORY_TRANSACTION_TYPES)),
    from: dateOnly,
    to: dateOnly,
  }),
};

const idRoute = { params: z.object({ id: id }) };
const medicationRoute = { params: z.object({ id: id }) };

module.exports = {
  createPrescription,
  updatePrescription,
  verify,
  dispense,
  cancel,
  listPrescriptions,
  restock,
  adjust,
  listMedications,
  listInventory,
  listTransactions,
  idRoute,
  medicationRoute,
};