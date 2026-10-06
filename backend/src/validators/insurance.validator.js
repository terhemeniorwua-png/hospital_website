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

/** Insurance provider / policy / claim contracts. */

const providerBody = z.object({
  name: z.string().trim().min(1).max(180),
  code: z.string().trim().min(1).max(40),
  contactPerson: optionalString(120),
  phone: optionalString(40),
  email: z.string().trim().toLowerCase().email('A valid email address is required').optional().nullable(),
  address: optionalString(255),
  website: optionalString(180),
  isActive: booleanish.optional(),
});

const policyBody = z
  .object({
    id: id.optional(),
    patientId: id,
    providerId: id,
    policyNumber: optionalString(60),
    planName: z.string().trim().min(1).max(120),
    coverageAmount: z.coerce.number().min(0).max(1_000_000_000),
    coveragePercentage: z.coerce.number().min(0).max(100),
    premiumAmount: z.coerce.number().min(0).max(1_000_000_000).optional(),
    startDate: dateOnly,
    endDate: dateOnly,
    status: enumOf(['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED']).optional(),
    isPrimary: booleanish.optional(),
    notes: optionalText(2000),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  });

const coverageCheck = {
  body: z.object({
    policyId: id,
    amount: z.coerce.number().min(0).max(1_000_000_000).optional(),
  }),
};

const submitClaim = {
  body: z.object({
    invoiceId: id,
    policyId: id,
    claimAmount: z.coerce.number().min(0).max(1_000_000_000).optional(),
    diagnosisSummary: optionalText(2000),
    supportingNotes: optionalText(4000),
  }),
};

const reviewClaim = {
  body: z.object({
    decision: enumOf(['APPROVED', 'REJECTED']),
    approvedAmount: z.coerce.number().min(0).max(1_000_000_000).optional(),
    reason: optionalText(1000),
  }),
};

const markClaimPaid = {
  body: z.object({
    reference: optionalString(120),
    paidAt: z.string().optional(),
    notes: optionalText(1000),
  }),
};

const listProviders = { query: z.object({ ...paginationQuery, isActive: optionalBooleanish, search: optionalString(120) }) };
const getProvider = { params: z.object({ id: id }) };
const createProvider = { body: providerBody };

const listPolicies = {
  query: z.object({
    ...paginationQuery,
    patientId: optionalId,
    providerId: optionalId,
    status: optionalEnumOf(['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED']),
    activeOnly: optionalBooleanish,
  }),
};

const listClaims = {
  query: z.object({
    ...paginationQuery,
    patientId: optionalId,
    policyId: optionalId,
    invoiceId: optionalId,
    status: optionalEnumOf(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED']),
  }),
};

const statistics = { query: z.object({ from: dateOnly.optional(), to: dateOnly.optional() }) };

module.exports = {
  providerBody,
  createProvider,
  getProvider,
  listProviders,
  policyBody,
  listPolicies,
  coverageCheck,
  submitClaim,
  reviewClaim,
  markClaimPaid,
  listClaims,
  statistics,
  idRoute: { params: z.object({ id: id }) },
  patientRoute: { params: z.object({ patientId: id }) },
};