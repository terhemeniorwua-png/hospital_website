const {
  id,
  z,
  dateOnly,
  optionalId,
  optionalString,
  paginationQuery,
} = require('./common');

/** Analytics and audit-report contracts. */

const overview = { query: z.object({ date: dateOnly.optional() }) };

const appointmentsTrend = {
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).optional(),
    departmentId: optionalId.optional(),
  }),
};

const bedOccupancy = { query: z.object({ wardId: optionalId.optional() }) };

const revenueByDay = { query: z.object({ days: z.coerce.number().int().min(1).max(365).optional() }) };

const rangeQuery = z.object({
  from: dateOnly.optional(),
  to: dateOnly.optional(),
});

const departmentUtilisation = { query: rangeQuery };

const topPrescriptions = {
  query: rangeQuery.extend({
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
};

const workload = { query: rangeQuery };

const performance = {
  query: rangeQuery.extend({
    limit: z.coerce.number().int().min(1).max(200).optional(),
  }),
};

const auditLog = {
  query: z.object({
    ...paginationQuery,
    action: optionalString(120),
    resource: optionalString(120),
    userId: optionalId,
    patientId: optionalId,
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    ipAddress: optionalString(64),
    statusCode: z.coerce.number().int().min(100).max(599).optional(),
  }),
};

const auditSummary = { query: rangeQuery };

module.exports = {
  overview,
  appointmentsTrend,
  bedOccupancy,
  revenueByDay,
  departmentUtilisation,
  topPrescriptions,
  workload,
  performance,
  auditLog,
  auditSummary,
};