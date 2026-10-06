const {
  id,
  z,
  booleanish,
  enumOf,
  optionalBooleanish,
  optionalEnumOf,
  optionalId,
  optionalString,
  paginationQuery,
} = require('./common');
const { DOCUMENT_CATEGORIES } = require('../config/constants');

/** Clinical document upload / download contracts. */

const list = {
  query: z.object({
    ...paginationQuery,
    patientId: optionalId,
    category: optionalEnumOf(Object.values(DOCUMENT_CATEGORIES)),
    referenceType: optionalString(40),
    referenceId: optionalId,
    private: optionalBooleanish,
    search: optionalString(120),
  }),
};

/**
 * Multer puts the text fields on the request body, so this is validated as a
 * form body rather than JSON. The file itself is handled by the multer middleware.
 */
const create = {
  body: z.object({
    patientId: id,
    category: enumOf(Object.values(DOCUMENT_CATEGORIES)),
    title: z.string().trim().min(1, 'A document title is required').max(180),
    referenceType: optionalString(40),
    referenceId: id.optional(),
    isPrivate: booleanish.optional(),
    description: z.string().trim().max(1000).optional(),
    performedAt: z.string().optional(),
    documentDate: z.string().optional(),
  }),
};

const verifyChecksum = {
  params: z.object({ id: id }),
  body: z.object({ checksum: optionalString(128) }),
};

module.exports = {
  list,
  create,
  verifyChecksum,
  idRoute: { params: z.object({ id: id }) },
};