const {
  id,
  z,
  booleanish,
  dateOnly,
  dateTime,
  enumOf,
  optionalEnumOf,
  optionalId,
  optionalString,
  optionalText,
  paginationQuery,
} = require('./common');

/** Imaging (radiology) order contracts. */

const create = {
  body: z.object({
    patientId: id,
    imagingType: z.string().trim().min(1).max(160),
    bodyPart: optionalString(80),
    consultationId: id.optional(),
    admissionId: id.optional(),
    priority: enumOf(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
    clinicalNotes: optionalText(2000),
    price: z.coerce.number().min(0).max(1_000_000).optional(),
  }),
};

const recordReport = {
  body: z.object({
    findings: optionalText(4000),
    report: optionalText(8000),
    status: enumOf(['ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    performedAt: dateTime,
    publish: booleanish.optional(),
  }),
};

const updateStatus = {
  body: z.object({
    status: enumOf(['ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    reason: optionalText(500),
  }),
};

const list = {
  query: z.object({
    ...paginationQuery,
    patientId: optionalId,
    priority: optionalEnumOf(['ROUTINE', 'URGENT', 'STAT']),
    status: optionalEnumOf(['ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    search: optionalString(120),
  }),
};

module.exports = {
  create,
  recordReport,
  updateStatus,
  list,
  idRoute: { params: z.object({ id: id }) },
};