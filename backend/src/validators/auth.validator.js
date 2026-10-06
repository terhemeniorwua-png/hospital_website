const { z, email, password, phone, gender, bloodGroup, dateOnly } = require('./common');

const login = {
  body: z.object({
    email,
    password: z.string().min(1, 'Password is required').max(128),
  }),
};

const refresh = {
  body: z.object({
    refreshToken: z.string().min(10, 'refreshToken is required'),
  }),
};

const register = {
  body: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80).optional().nullable(),
    email,
    password,
    phone,
    gender,
    dateOfBirth: dateOnly,
    address: z.string().trim().max(255).optional().nullable(),
    city: z.string().trim().max(80).optional().nullable(),
    state: z.string().trim().max(80).optional().nullable(),
    bloodGroup,
    emergencyContactName: z.string().trim().max(120).optional().nullable(),
    emergencyContactPhone: phone,
    emergencyContactRelationship: z.string().trim().max(80).optional().nullable(),
    occupation: z.string().trim().max(120).optional().nullable(),
  }),
};

const changePassword = {
  body: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: password,
      confirmPassword: z.string().optional(),
    })
    .refine((data) => !data.confirmPassword || data.confirmPassword === data.newPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
};

const forgotPassword = {
  body: z.object({ email }),
};

const resetPassword = {
  body: z
    .object({
      token: z.string().min(10, 'token is required'),
      newPassword: password,
      confirmPassword: z.string().optional(),
    })
    .refine((data) => !data.confirmPassword || data.confirmPassword === data.newPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
};

module.exports = { login, refresh, register, changePassword, forgotPassword, resetPassword };
