const {
  email,
  id,
  password,
  phone,
  text,
  z,
  bloodGroup,
  booleanish,
  dateOnly,
  enumList,
  enumOf,
  gender,
  idRoute,
  optionalBloodGroup,
  optionalBooleanish,
  optionalEnumOf,
  optionalGender,
  optionalString,
  optionalText,
  paginationQuery,
} = require('./common');
const { PATIENT_STATUS } = require('../config/constants');

/**
 * Patient registry input contracts.
 *
 * The `PATCH` schema deliberately omits `status`, `hospitalNumber` and the
 * clinical columns so a patient portal account can never escalate itself -
 * `patient.service.update` re-checks ownership on top of this.
 */

const addresses = {
  address: optionalString(255),
  city: optionalString(80),
  state: optionalString(80),
  occupation: optionalString(120),
};

const emergencyContact = {
  emergencyContactName: optionalString(120),
  emergencyContactPhone: optionalString(30),
  emergencyContactRelationship: optionalString(50),
};

const create = {
  body: z.object({
    firstName: z.string().trim().min(1, 'firstName is required').max(80),
    lastName: optionalString(80),
    middleName: optionalString(80),
    dateOfBirth: dateOnly,
    gender,
    phone: optionalString(30),
    email: email.optional().nullable().or(z.literal('')),
    ...addresses,
    ...emergencyContact,
    bloodGroup: bloodGroup.optional().nullable().or(z.literal('')),
    genotype: optionalString(16),
    maritalStatus: optionalString(40),
    status: enumOf(Object.values(PATIENT_STATUS)).optional(),
    // Portal account creation is optional for reception-registered patients.
    password: password.optional().or(z.literal('')),
    createLogin: booleanish.optional(),
  }),
};

const update = {
  body: z
    .object({
      firstName: z.string().trim().min(1).max(80),
      lastName: optionalString(80),
      middleName: optionalString(80),
      dateOfBirth: dateOnly,
      gender,
      phone: optionalString(30),
      email: email.optional().nullable().or(z.literal('')),
      ...addresses,
      ...emergencyContact,
      bloodGroup: bloodGroup.optional().nullable().or(z.literal('')),
      genotype: optionalString(16),
      maritalStatus: optionalString(40),
      status: enumOf(Object.values(PATIENT_STATUS)),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be supplied' }),
};

const list = {
  query: z.object({
    ...paginationQuery,
    status: optionalEnumOf(Object.values(PATIENT_STATUS)),
    gender: optionalGender,
    bloodGroup: optionalBloodGroup,
    hospitalNumber: optionalString(40),
    phone: optionalString(40),
    email: optionalString(120),
    createdFrom: dateOnly,
    createdTo: dateOnly,
  }),
};

const search = {
  query: z.object({
    ...paginationQuery,
    // The service reads `search`; `q` is accepted as an alias so neither
    // spelling is silently dropped by validation.
    q: optionalString(120),
    search: optionalString(120),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
};

/** `includeClinical` widens the patient payload for staff viewers. */
const show = {
  params: z.object({ id: id }),
  query: z.object({ includeClinical: optionalBooleanish.optional() }),
};

const allergy = {
  body: z.object({
    allergen: z.string().trim().min(1, 'An allergen is required').max(150),
    severity: enumOf(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']).default('MILD'),
    reaction: optionalString(255),
    type: enumOf(['DRUG', 'FOOD', 'ENVIRONMENT', 'OTHER']).default('DRUG'),
    notes: optionalText(1000),
    diagnosedAt: dateOnly,
  }),
};

const condition = {
  body: z.object({
    conditionName: z.string().trim().min(1, 'A condition name is required').max(180),
    icdCode: optionalString(20),
    severity: enumOf(['MILD', 'MODERATE', 'SEVERE']).optional(),
    status: enumOf(['ACTIVE', 'RESOLVED', 'REMISSION', 'CHRONIC', 'DECEASED']).optional(),
    diagnosedAt: dateOnly,
    resolvedAt: dateOnly,
    notes: optionalText(1000),
  }),
};

const conditionUpdate = {
  body: z
    .object({
      conditionName: z.string().trim().min(1).max(180),
      icdCode: optionalString(20),
      severity: enumOf(['MILD', 'MODERATE', 'SEVERE']),
      status: enumOf(['ACTIVE', 'RESOLVED', 'REMISSION', 'CHRONIC', 'DECEASED']),
      diagnosedAt: dateOnly,
      resolvedAt: dateOnly,
      notes: optionalText(1000),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be supplied' }),
};

/** Mirrors `MedicalHistory`: category / condition / onsetDate / resolutionDate. */
const history = {
  params: z.object({ patientId: id }),
  body: z.object({
    category: enumOf(['MEDICAL', 'SURGICAL', 'OBSTETRIC', 'FAMILY', 'SOCIAL', 'SHORTNESS']).default('MEDICAL'),
    condition: z.string().trim().min(1, 'A condition is required').max(180),
    onsetDate: dateOnly,
    resolutionDate: dateOnly,
    isOngoing: booleanish.optional(),
    notes: optionalText(2000),
  }),
};

const historyList = { params: z.object({ patientId: id }) };

const byPatient = {
  params: z.object({ patientId: id }),
};

const nestedId = {
  params: z.object({ patientId: id, allergyId: id.optional(), conditionId: id.optional() }),
};

const nestedIdOnly = {
  params: z.object({ patientId: id }),
};

const pagination = {
  query: z.object({ ...paginationQuery, limit: z.coerce.number().int().min(1).max(200).optional() }),
};

module.exports = {
  create,
  update,
  list,
  search,
  show,
  allergy,
  condition,
  conditionUpdate,
  history,
  historyList,
  byPatient,
  nestedId,
  nestedIdOnly,
  pagination,
  idRoute,
  enumList,
};