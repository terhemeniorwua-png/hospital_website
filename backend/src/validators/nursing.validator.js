const {
  id,
  z,
  dateOnly,
  dateTime,
  enumOf,
  optionalEnumOf,
  optionalId,
  optionalText,
  paginationQuery,
} = require('./common');
const { vitalSigns } = require('./vitals.validator');

/** Nursing: assignments, notes, medication administration, observations. */

const listQuery = z.object({
  ...paginationQuery,
  patientId: optionalId,
  admissionId: optionalId,
  wardId: optionalId,
  bedId: optionalId,
  status: optionalEnumOf(['SCHEDULED', 'ADMINISTERED', 'REFUSED', 'HELD', 'OMITTED']),
  shift: optionalEnumOf(['MORNING', 'AFTERNOON', 'NIGHT']),
  critical: z.enum(['true', 'false']).optional(),
  date: dateOnly,
  search: z.string().trim().max(120).optional(),
});

const createNote = {
  body: z.object({
    patientId: id.optional(),
    admissionId: id.optional(),
    wardId: id.optional(),
    noteType: enumOf(['ASSESSMENT', 'PROGRESS', 'NURSING_CARE', 'TRANSFER', 'INCIDENT', 'DISCHARGE']).default('PROGRESS'),
    note: z.string().trim().min(1, 'A note body is required').max(8000),
    isCritical: z.coerce.boolean().optional(),
    shift: enumOf(['MORNING', 'AFTERNOON', 'NIGHT']).optional(),
    recordedAt: dateTime,
  }),
};

const createSchedule = {
  body: z.object({
    prescriptionId: id,
    admissionId: id,
    startAt: dateTime,
    days: z.coerce.number().int().min(1).max(30).optional(),
  }),
};

const recordAdministration = {
  body: z.object({
    status: enumOf(['SCHEDULED', 'ADMINISTERED', 'REFUSED', 'HELD', 'OMITTED']),
    notes: optionalText(2000),
  }),
};

const recordVitals = {
  body: vitalSigns.extend({
    patientId: id.optional(),
    admissionId: id.optional(),
  }),
};

const doctorOrders = { query: z.object({ patientId: optionalId }) };

const statistics = { query: z.object({ date: dateOnly.optional() }) };

const idRoute = { params: z.object({ id: id }) };

module.exports = {
  listQuery,
  createNote,
  createSchedule,
  recordAdministration,
  recordVitals,
  doctorOrders,
  statistics,
  idRoute,
};