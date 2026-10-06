const { z } = require('zod');
const { ROLES, GENDERS, BLOOD_GROUPS } = require('../config/constants');

const email = z.string().trim().toLowerCase().email('Enter a valid email address');
const password = z.string().min(8, 'Password must be at least 8 characters').max(72);
const id = z.coerce.number().int().positive('Invalid id');

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{5,19}$/, 'Enter a valid phone number');

const gender = z.enum(GENDERS);
const bloodGroup = z.enum(BLOOD_GROUPS);

/** Required free-text field with a trimmed body. */
const text = (max = 5000) => z.string().trim().min(1, 'This field is required').max(max);

/** `HH:MM` in 24-hour form, used for appointment slots. */
const timeString = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use 24-hour HH:MM format');

/** Comma-separated query value restricted to a fixed set of values. */
const enumList = (values, { upperCase = true } = {}) =>
  z
    .string()
    .transform((value) => value.split(',').map((part) => part.trim()).filter(Boolean).map((part) => (upperCase ? part.toUpperCase() : part)))
    .refine((items) => items.length > 0 && items.every((item) => values.includes(item)), {
      message: `Allowed values: ${values.join(', ')}`,
    });

/**
 * Comma-separated query filter. Absent means "no filter", so the parsed list is
 * `undefined` rather than `[]` to keep it out of service-layer `where` clauses.
 */
const optionalEnumList = (values, options) =>
  enumList(values, options)
    .optional()
    .transform((items) => (Array.isArray(items) && items.length ? items : undefined));

/** `{ params: { id } }` for `/.../:id` routes. */
const idRoute = { params: z.object({ id }) };

const optionalString = (max = 255) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (typeof value === 'string' && value.length ? value : undefined));

const optionalText = (max = 5000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (typeof value === 'string' && value.length ? value : undefined));

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Enter a real calendar date')
  .optional()
  .nullable()
  .transform((value) => value || undefined);

const dateTime = z
  .union([z.string(), z.date()])
  .optional()
  .nullable()
  .transform((value, ctx) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid date and time' });
      return z.NEVER;
    }
    return parsed;
  });

const enumOf = (values) => z.enum(values);

/** Accepts ?flag=true / ?flag=false and the strings "true"/"false". */
const booleanish = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1');

/**
 * Query-string filters are always optional, so the list/search schemas reuse
 * these wrappers instead of appending `.optional()` at every call site.
 */
const optionalId = id.optional();
const optionalEnumOf = (values) => enumOf(values).optional();
const optionalBooleanish = booleanish.optional();
const optionalGender = gender.optional();
const optionalBloodGroup = bloodGroup.optional();
const optionalDate = dateOnly;
const optionalTime = timeString.optional();

const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: optionalString(60),
  order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional(),
};

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

module.exports = {
  z,
  email,
  password,
  id,
  phone,
  gender,
  bloodGroup,
  text,
  timeString,
  enumList,
  optionalEnumList,
  idRoute,
  optionalString,
  optionalText,
  dateOnly,
  dateTime,
  enumOf,
  booleanish,
  optionalId,
  optionalEnumOf,
  optionalBooleanish,
  optionalGender,
  optionalBloodGroup,
  optionalDate,
  optionalTime,
  paginationQuery,
  pagination,
  ROLES,
  GENDERS,
  BLOOD_GROUPS,
};