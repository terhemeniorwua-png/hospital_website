const {
  id,
  z,
  booleanish,
  dateOnly,
  enumOf,
  optionalEnumOf,
  optionalId,
  optionalString,
  optionalText,
  paginationQuery,
} = require('./common');
const { QUEUE_STATUS } = require('../config/constants');

/** Waiting-room queue contracts. */

const PRIORITIES = ['ROUTINE', 'URGENT', 'EMERGENCY'];

const join = {
  body: z.object({
    patientId: id,
    departmentId: id,
    doctorId: id.optional(),
    appointmentId: id.optional(),
    date: dateOnly.optional(),
    priority: enumOf(PRIORITIES).default('ROUTINE'),
    isWalkIn: booleanish.optional(),
    notes: optionalText(500),
  }),
};

const callNext = {
  body: z.object({
    departmentId: id,
    date: dateOnly.optional(),
    ticketNumber: optionalString(20),
  }),
};

const board = {
  query: z.object({ departmentId: id, date: dateOnly.optional() }),
};

const list = {
  query: z.object({
    ...paginationQuery,
    date: dateOnly,
    departmentId: optionalId,
    doctorId: optionalId,
    status: optionalEnumOf(Object.values(QUEUE_STATUS)),
    priority: optionalEnumOf(PRIORITIES),
  }),
};

const update = {
  body: z
    .object({
      doctorId: id,
      priority: enumOf(PRIORITIES),
      notes: optionalText(500),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be supplied' }),
};

const complete = {
  body: z.object({ notes: optionalText(500) }),
};

const skip = {
  body: z.object({ reason: optionalText(500) }),
};

const estimate = {
  query: z.object({ departmentId: id, date: dateOnly.optional(), ticketNumber: z.string().trim().min(1).max(20) }),
};

const statistics = {
  query: z.object({ departmentId: optionalId.optional(), date: dateOnly.optional() }),
};

const departmentParam = { params: z.object({ departmentId: id }) };
const idRoute = { params: z.object({ id: id }) };

module.exports = {
  join,
  callNext,
  board,
  list,
  update,
  complete,
  skip,
  estimate,
  statistics,
  departmentParam,
  idRoute,
};