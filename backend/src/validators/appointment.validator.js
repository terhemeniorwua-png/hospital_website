const {
  email,
  id,
  phone,
  z,
  booleanish,
  dateOnly,
  enumOf,
  optionalBooleanish,
  optionalEnumList,
  optionalEnumOf,
  optionalId,
  optionalString,
  optionalText,
  paginationQuery,
  timeString,
} = require('./common');
const { APPOINTMENT_STATUS } = require('../config/constants');

/** Department -> Doctor -> Date -> Time -> Appointment booking contracts. */

const STATUSES = Object.values(APPOINTMENT_STATUS);
const TYPES = ['NEW', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE', 'SPECIALIST'];

const book = {
  body: z.object({
    patientId: id,
    doctorId: id,
    departmentId: id,
    appointmentDate: dateOnly,
    slotId: id,
    startTime: timeString,
    type: enumOf(TYPES).default('NEW'),
    reason: optionalText(1000),
    notes: optionalText(1000),
    fee: z.coerce.number().min(0).max(1_000_000).optional(),
    autoConfirm: booleanish.optional(),
    allowPastDate: booleanish.optional(),
    rescheduledFromId: id.optional(),
  }),
};

const reschedule = {
  body: z.object({
    doctorId: id,
    departmentId: id,
    appointmentDate: dateOnly,
    slotId: id,
    startTime: timeString,
    allowPastDate: booleanish.optional(),
  }),
};

const list = {
  query: z.object({
    ...paginationQuery,
    status: optionalEnumList(STATUSES),
    patientId: optionalId,
    doctorId: optionalId,
    departmentId: optionalId,
    type: optionalEnumOf(TYPES),
    date: dateOnly,
    from: dateOnly,
    to: dateOnly,
    upcoming: optionalBooleanish,
    mine: optionalBooleanish,
  }),
};

const availability = {
  query: z.object({ doctorId: id, date: dateOnly }),
};

const availableDoctors = {
  query: z.object({
    ...paginationQuery,
    departmentId: optionalId,
    date: dateOnly,
    specialization: optionalString(120),
  }),
};

const blockSlot = {
  body: z.object({
    isBlocked: z.coerce.boolean(),
    notes: optionalText(500),
  }),
};

const cancel = {
  body: z.object({ reason: optionalText(500) }),
};

/** Optional reason carried by every status transition action. */
const reasonBody = {
  body: z.object({ reason: optionalText(500), notes: optionalText(2000) }),
};

const markNoShows = {
  body: z.object({ date: dateOnly, departmentId: id.optional() }),
};

const doctorSlots = {
  params: z.object({ doctorId: id, slotId: id }),
};

const patientHistory = {
  params: z.object({ patientId: id }),
  query: z.object({ ...paginationQuery }),
};

const followUps = {
  query: z.object({ ...paginationQuery, from: dateOnly, to: dateOnly }),
};

const statistics = {
  query: z.object({ date: dateOnly, departmentId: optionalId.optional() }),
};

module.exports = {
  book,
  reschedule,
  list,
  availability,
  availableDoctors,
  blockSlot,
  cancel,
  reasonBody,
  markNoShows,
  doctorSlots,
  patientHistory,
  followUps,
  statistics,
  idRoute: { params: z.object({ id: id }) },
  byPatient: { params: z.object({ patientId: id }) },
  statuses: STATUSES,
};