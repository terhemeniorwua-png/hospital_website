const {
  id,
  z,
  dateOnly,
  enumOf,
  optionalEnumList,
  optionalEnumOf,
  paginationQuery,
} = require('./common');
const { MEDICAL_RECORD_TYPES } = require('../config/constants');

/**
 * Electronic medical record access.
 *
 * `assertCanAccess` in `medicalRecord.service` is the real guard (a patient may
 * only ever read their own timeline); these schemas simply bound the filters.
 */

const TYPES = Object.values(MEDICAL_RECORD_TYPES);

const list = {
  params: z.object({ patientId: id }),
  query: z.object({
    ...paginationQuery,
    recordType: optionalEnumOf(TYPES),
    from: dateOnly,
    to: dateOnly,
  }),
};

const timeline = {
  params: z.object({ patientId: id }),
  query: z.object({
    from: dateOnly,
    to: dateOnly,
    limit: z.coerce.number().int().min(1).max(500).optional(),
    type: optionalEnumList(TYPES),
  }),
};

const summary = { params: z.object({ patientId: id }) };

const exportRecord = {
  params: z.object({ patientId: id }),
  query: z.object({ format: z.enum(['json', 'text', 'csv']).default('json') }),
};

const patientRoute = { params: z.object({ patientId: id }) };

module.exports = { list, timeline, summary, exportRecord, patientRoute };