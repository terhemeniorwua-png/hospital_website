const {
  id,
  z,
  booleanish,
  dateOnly,
  dateTime,
  enumOf,
  optionalBooleanish,
  optionalEnumList,
  optionalEnumOf,
  optionalId,
  optionalString,
  optionalText,
  paginationQuery,
} = require('./common');
const { ADMISSION_STATUS, BED_STATUS } = require('../config/constants');

/** Ward / room / bed and admission contracts. */

const listWards = {
  query: z.object({ ...paginationQuery, isActive: optionalBooleanish, search: optionalString(120) }),
};

const listBeds = {
  query: z.object({
    ...paginationQuery,
    wardId: optionalId,
    roomId: optionalId,
    status: optionalEnumOf(Object.values(BED_STATUS)),
    availableOnly: optionalBooleanish,
    search: optionalString(120),
  }),
};

const setBedStatus = {
  body: z.object({
    status: enumOf(Object.values(BED_STATUS)),
    notes: optionalText(500),
  }),
};

const admit = {
  body: z
    .object({
      patientId: id,
      bedId: id,
      wardId: id,
      roomType: enumOf(['GENERAL', 'PRIVATE', 'ICU', 'HDU', 'ISOLATION', 'THEATRE']).optional(),
      attendingDoctorId: id.optional(),
      emergencyCaseId: id.optional(),
      consultationId: id.optional(),
      admittedFrom: enumOf(['OPD', 'EMERGENCY', 'TRANSFER', 'REFERRAL', 'ELECTIVE']).optional(),
      reasonForAdmission: optionalText(2000),
      diagnosis: optionalText(2000),
      conditionOnAdmission: enumOf(['STABLE', 'CRITICAL', 'SERIOUS', 'EMERGENCY']).optional(),
      dailyRate: z.coerce.number().min(0).max(1_000_000).optional(),
      expectedDischargeAt: dateTime,
      notes: optionalText(2000),
    })
    .refine((data) => Boolean(data.bedId || data.wardId), {
      message: 'Provide either bedId or wardId',
      path: ['bedId'],
    }),
};

const transfer = {
  body: z
    .object({
      bedId: id,
      wardId: id,
      reason: optionalText(1000),
    })
    .refine((data) => Boolean(data.bedId || data.wardId), {
      message: 'Provide either bedId or wardId',
      path: ['bedId'],
    }),
};

const discharge = {
  body: z.object({
    dischargeType: enumOf(['NORMAL', 'ABSCONDED', 'TRANSFERRED_OUT', 'LAMA', 'REFERRED']).optional(),
    dischargedTo: optionalString(255),
    dischargeSummary: optionalText(8000),
    dischargeMedications: optionalText(4000),
    conditionOnDischarge: optionalString(255),
    followUpDate: dateOnly,
  }),
};

const listAdmissions = {
  query: z.object({
    ...paginationQuery,
    patientId: optionalId,
    wardId: optionalId,
    bedId: optionalId,
    active: optionalBooleanish,
    date: dateOnly,
    status: optionalEnumList(Object.values(ADMISSION_STATUS)),
    search: optionalString(120),
  }),
};

const statistics = { query: z.object({ wardId: optionalId.optional(), date: dateOnly.optional() }) };

const idRoute = { params: z.object({ id: id }) };
const wardRoute = { params: z.object({ id: id }) };

module.exports = {
  listWards,
  listBeds,
  setBedStatus,
  admit,
  transfer,
  discharge,
  listAdmissions,
  statistics,
  idRoute,
  wardRoute,
};