const {
  id,
  z,
  dateOnly,
  dateTime,
  enumOf,
  optionalEnumOf,
  optionalId,
  optionalString,
  optionalText,
  paginationQuery,
} = require('./common');
const { EMERGENCY_STATUS } = require('../config/constants');
const { vitalReadings } = require('./vitals.validator');

/** Emergency department registration, triage and outcome contracts. */

const register = {
  body: z
    .object({
      patientId: id.optional(),
      walkInName: optionalString(120),
      walkInAge: z.coerce.number().int().min(0).max(130).optional(),
      walkInGender: enumOf(['MALE', 'FEMALE', 'OTHER']).optional(),
      walkInPhone: optionalString(40),
      chiefComplaint: z.string().trim().min(1, 'A chief complaint is required').max(2000),
      presentingVitals: z.object(vitalReadings).optional(),
      departmentId: id.optional(),
      arrivalAt: dateTime,
      notes: optionalText(2000),
    })
    .refine((data) => Boolean(data.patientId || data.walkInName), {
      message: 'Provide patientId or walkInName for walk-in registration',
      path: ['patientId'],
    }),
};

const triage = {
  body: z.object({
    triageLevel: z.coerce.number().int().min(1).max(4),
    departmentId: id.optional(),
    notes: optionalText(2000),
    vitals: z.object(vitalReadings).partial().optional(),
  }),
};

const assignDoctor = {
  body: z.object({
    doctorId: id,
    departmentId: id.optional(),
  }),
};

const callNext = {
  body: z.object({
    departmentId: id,
    doctorId: id.optional(),
    room: optionalString(20),
  }),
};

const recordVitals = { body: vitalReadings };

const list = {
  query: z.object({
    ...paginationQuery,
    patientId: optionalId,
    departmentId: optionalId,
    assignedDoctorId: optionalId,
    status: optionalEnumOf(Object.values(EMERGENCY_STATUS)),
    triageLevel: z.coerce.number().int().min(1).max(4).optional(),
    active: z.enum(['true', 'false']).optional(),
    date: dateOnly,
    search: z.string().trim().max(120).optional(),
  }),
};

const waitingRoom = { query: z.object({ departmentId: optionalId.optional() }) };

const board = { query: z.object({ date: dateOnly.optional() }) };

const startConsultation = {
  body: z.object({
    history: optionalText(4000),
    assessment: optionalText(4000),
    diagnosisSummary: optionalText(4000),
    treatmentPlan: optionalText(4000),
    treatmentNotes: optionalText(4000),
    physicalExamination: optionalText(4000),
  }),
};

const admit = {
  body: z.object({
    bedId: id.optional(),
    wardId: id.optional(),
    roomType: enumOf(['GENERAL', 'PRIVATE', 'ICU', 'HDU', 'ISOLATION', 'THEATRE']).optional(),
    attendingDoctorId: id.optional(),
    reasonForAdmission: optionalText(2000),
    diagnosis: optionalText(2000),
    conditionOnAdmission: enumOf(['STABLE', 'CRITICAL', 'SERIOUS', 'EMERGENCY']).optional(),
    dailyRate: z.coerce.number().min(0).max(1_000_000).optional(),
    expectedDischargeAt: dateTime,
    treatmentNotes: optionalText(4000),
    notes: optionalText(2000),
  }),
};

const linkPatient = { body: z.object({ patientId: id }) };

const discharge = {
  body: z.object({
    outcome: enumOf(['STABLE', 'IMPROVED', 'UNCHANGED', 'DECLINED', 'REFERRED_OUT', 'ADMITTED']).optional(),
    treatmentNotes: optionalText(4000),
  }),
};

const statistics = { query: z.object({ date: dateOnly.optional() }) };

module.exports = {
  register,
  triage,
  assignDoctor,
  callNext,
  recordVitals,
  list,
  waitingRoom,
  board,
  startConsultation,
  admit,
  linkPatient,
  discharge,
  statistics,
  idRoute: { params: z.object({ id: id }) },
};