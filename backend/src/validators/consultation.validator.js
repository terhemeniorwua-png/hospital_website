const {
  id,
  z,
  booleanish,
  dateOnly,
  dateTime,
  enumOf,
  optionalBooleanish,
  optionalEnumOf,
  optionalId,
  optionalString,
  optionalText,
  paginationQuery,
} = require('./common');
const { CONSULTATION_STATUS } = require('../config/constants');
const { vitalSigns } = require('./vitals.validator');

/** Doctor consultation (SOAP) contracts. */

const soap = {
  chiefComplaint: optionalText(1000),
  symptoms: optionalText(4000),
  history: optionalText(4000),
  physicalExamination: optionalText(4000),
  assessment: optionalText(4000),
  diagnosisSummary: optionalText(4000),
  treatmentPlan: optionalText(4000),
  doctorNotes: optionalText(4000),
};

const start = {
  body: z.object({
    patientId: id,
    doctorId: id.optional(),
    departmentId: id.optional(),
    appointmentId: id.optional(),
    queueEntryId: id.optional(),
    admissionId: id.optional(),
    ...soap,
    vitalsSnapshot: z.record(z.string(), z.any()).optional().nullable(),
    followUpDate: dateOnly,
  }),
};

const update = {
  body: z
    .object({
      ...soap,
      status: enumOf(Object.values(CONSULTATION_STATUS)),
      followUpDate: dateOnly,
      vitalsSnapshot: z.record(z.string(), z.any()).optional().nullable(),
      allowCompletedEdit: booleanish.optional(),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be supplied' }),
};

const complete = {
  body: z.object({ ...soap, followUpDate: dateOnly }).partial(),
};

const list = {
  query: z.object({
    ...paginationQuery,
    patientId: optionalId,
    doctorId: optionalId,
    departmentId: optionalId,
    appointmentId: optionalId,
    status: optionalEnumOf(Object.values(CONSULTATION_STATUS)),
    from: dateOnly,
    to: dateOnly,
    active: optionalBooleanish,
  }),
};

const diagnosis = {
  body: z.object({
    code: optionalString(40),
    description: z.string().trim().min(1).max(500),
    type: enumOf(['PRIMARY', 'SECONDARY', 'PROVISIONAL', 'FINAL', 'DIFFERENTIAL']).default('PRIMARY'),
    status: enumOf(['ACTIVE', 'RESOLVED', 'CHRONIC', 'RULED_OUT']).optional(),
    notes: optionalText(2000),
    diagnosedAt: dateTime,
  }),
};

const diagnosisUpdate = {
  body: z
    .object({
      code: optionalString(40),
      description: z.string().trim().min(1).max(500),
      type: enumOf(['PRIMARY', 'SECONDARY', 'PROVISIONAL', 'FINAL', 'DIFFERENTIAL']),
      status: enumOf(['ACTIVE', 'RESOLVED', 'CHRONIC', 'RULED_OUT']),
      notes: optionalText(2000),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be supplied' }),
};

const recordVitals = {
  body: vitalSigns.extend({
    patientId: id.optional(),
    consultationId: id.optional(),
    admissionId: id.optional(),
  }),
};

const clinicalHistory = {
  params: z.object({ patientId: id }),
};

const followUps = {
  query: z.object({ ...paginationQuery, patientId: optionalId, doctorId: optionalId }),
};

const statistics = { query: z.object({ date: dateOnly }) };

module.exports = {
  start,
  update,
  complete,
  list,
  diagnosis,
  diagnosisUpdate,
  recordVitals,
  clinicalHistory,
  followUps,
  statistics,
  idRoute: { params: z.object({ id: id }) },
  consultationRoute: { params: z.object({ id: id }) },
  diagnosisRoute: { params: z.object({ id: id, diagnosisId: id }) },
};