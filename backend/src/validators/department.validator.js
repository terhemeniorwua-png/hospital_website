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
const { ROLES, USER_STATUS } = require('../config/constants');
const { STAFF_TYPES } = require('../config/constants');

/** Department + staff administration contracts. */

/** Mirrors `DEPT_FIELDS` in `department.service` and the `departments` table. */
const departmentBody = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(20),
  description: optionalText(1000),
  location: optionalString(255),
  phone: optionalString(40),
  email: z.string().trim().toLowerCase().email('A valid email address is required').optional().nullable(),
  isEmergency: booleanish.optional(),
  isActive: booleanish.optional(),
});

const createDepartment = { body: departmentBody };

const updateDepartment = {
  body: departmentBody
    .partial()
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be supplied' }),
};

const departmentParam = { params: z.object({ id: id }) };
const departmentIdParam = { params: z.object({ departmentId: id }) };

const listDepartments = {
  query: z.object({
    ...paginationQuery,
    isActive: optionalBooleanish,
    isEmergency: optionalBooleanish,
  }),
};

const departmentStatistics = {
  params: z.object({ id: id }),
  query: z.object({ from: dateOnly, to: dateOnly }),
};

const assignStaff = {
  params: z.object({ departmentId: id }),
  body: z.object({
    userId: id,
    roleInDepartment: optionalString(60),
    isPrimary: booleanish.optional(),
  }),
};

const removeStaff = {
  params: z.object({ departmentId: id, userId: id }),
};

const staffList = {
  params: z.object({ id: id, departmentId: id.optional() }),
  query: z.object({
    ...paginationQuery,
    role: optionalEnumOf(Object.values(ROLES)),
    search: optionalString(120),
  }),
};

/* ------------------------------------------------------------------ *
 * Staff accounts
 * ------------------------------------------------------------------ */

const doctorProfile = z.object({
  departmentId: id,
  specialization: z.string().trim().min(1).max(120),
  subSpecialization: optionalString(120),
  licenseNumber: optionalString(60),
  registrationNumber: optionalString(60),
  qualification: optionalString(200),
  yearsOfExperience: z.coerce.number().int().min(0).max(70).optional(),
  consultationFee: z.coerce.number().min(0).max(1_000_000).optional(),
  slotDurationMinutes: z.coerce.number().int().min(5).max(240).optional(),
  isOnDuty: booleanish.optional(),
  isAcceptingAppointments: booleanish.optional(),
  availability: z.record(z.string(), z.any()).optional(),
});

const nurseProfile = z.object({
  departmentId: id,
  qualification: optionalString(200),
  licenseNumber: optionalString(60),
  registrationNumber: optionalString(60),
  shift: optionalString(40),
  isOnDuty: booleanish.optional(),
});

const staffProfile = z.object({
  departmentId: id.optional(),
  staffType: enumOf(Object.values(STAFF_TYPES)).optional(),
  jobTitle: optionalString(120),
  employeeNumber: optionalString(40),
  dateEmployed: dateOnly,
});

const createStaff = {
  body: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: optionalString(80),
    email: z.string().trim().toLowerCase().email('A valid email address is required'),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/\d/),
    phone: optionalString(40),
    role: enumOf(Object.values(ROLES)),
    departmentId: id.optional(),
    roleInDepartment: optionalString(60),
    employeeId: optionalString(40),
    gender: enumOf(['MALE', 'FEMALE', 'OTHER']).optional(),
    address: optionalString(255),
    status: enumOf(Object.values(USER_STATUS)).optional(),
    doctor: doctorProfile.optional(),
    nurse: nurseProfile.optional(),
    staff: staffProfile.optional(),
  }),
};

const updateStaff = {
  body: z
    .object({
      firstName: z.string().trim().min(1).max(80),
      lastName: optionalString(80),
      email: z.string().trim().toLowerCase().email('A valid email address is required'),
      password: z.string().min(8).max(128).optional(),
      phone: optionalString(40),
      employeeId: optionalString(40),
      gender: enumOf(['MALE', 'FEMALE', 'OTHER']),
      address: optionalString(255),
      status: enumOf(Object.values(USER_STATUS)),
      role: enumOf(Object.values(ROLES)),
      doctor: doctorProfile.partial().optional(),
      nurse: nurseProfile.partial().optional(),
      staff: staffProfile.partial().optional(),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be supplied' }),
};

const staffListQuery = {
  query: z.object({
    ...paginationQuery,
    role: optionalEnumOf(Object.values(ROLES)),
    roleId: optionalId,
    departmentId: optionalId,
    status: optionalEnumOf(Object.values(USER_STATUS)),
  }),
};

/**
 * `roleName` is what `staff.service.changeRole` expects; the body key is
 * `roleName` so it cannot be confused with the `role` key used at creation.
 */
const changeRole = {
  body: z.object({ roleName: enumOf(Object.values(ROLES)) }),
};

const setStatus = {
  body: z.object({ status: enumOf(Object.values(USER_STATUS)) }),
};

const userRoute = { params: z.object({ id: id }) };
const userRoleRoute = { params: z.object({ userId: id }) };

module.exports = {
  createDepartment,
  updateDepartment,
  departmentParam,
  departmentIdParam,
  listDepartments,
  departmentStatistics,
  assignStaff,
  removeStaff,
  staffList,
  createStaff,
  updateStaff,
  staffListQuery,
  changeRole,
  setStatus,
  userRoute,
  userRoleRoute,
};