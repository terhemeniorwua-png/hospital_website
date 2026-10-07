const { Op } = require('sequelize');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { hashPassword, comparePassword, safeEquals } = require('../utils/password');
const { sha256, randomToken } = require('../utils/codeGenerator');
const jwt = require('../utils/jwt');
const { getIp, getUserAgent } = require('../utils/requestInfo');
const { roleNameOf } = require('../utils/accessControl');
const { User, Role, Patient, RefreshToken, PasswordReset } = require('../models');
const { USER_STATUS } = require('../config/constants');

/**
 * Authentication, refresh-token rotation and password recovery.
 *
 * Security rules enforced here:
 *  - passwords are only ever stored as bcrypt hashes
 *  - refresh tokens are stored hashed (sha256) and rotated on every use, with
 *    reuse detection revoking the whole chain
 *  - repeated failures lock the account for `ACCOUNT_LOCK_MINUTES`
 */

const REFRESH_TOKEN_BYTES = 48;

const sanitizeUser = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: `${user.firstName} ${user.lastName || ''}`.trim(),
  email: user.email,
  phone: user.phone,
  status: user.status,
  role: roleNameOf(user),
  patientId: user.patientId,
  employeeId: user.employeeId,
  mustChangePassword: user.mustChangePassword,
});

/** Issues an access/refresh pair and persists the hashed refresh token. */
async function issueTokens(user, req, transaction) {
  const accessToken = jwt.signAccessToken(user);
  const refreshToken = jwt.signRefreshToken(user);
  const decoded = jwt.verifyRefreshToken(refreshToken);

 await RefreshToken.create(
  {
    userId: user.id,
    tokenHash: sha256(refreshToken),
    jti: decoded.jti,
    expiresAt: new Date(
      Date.now() + jwt.refreshTokenTtlSeconds() * 1000
    ),
    userAgent: getUserAgent(req),
    ipAddress: getIp(req),
  },
  { transaction }
);

  return { accessToken, refreshToken, expiresIn: jwt.refreshTokenTtlSeconds() };
}

function assertNotLocked(user) {
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const minutes = Math.ceil((new Date(user.lockedUntil) - Date.now()) / 60000);
    throw AppError.forbidden(`Account locked. Try again in ${minutes} minute(s)`);
  }
}

async function registerFailure(user) {
  const attempts = (user.failedLoginAttempts || 0) + 1;
  const patch = { failedLoginAttempts: attempts };

  if (attempts >= env.MAX_LOGIN_ATTEMPTS) {
    patch.lockedUntil = new Date(Date.now() + env.ACCOUNT_LOCK_MINUTES * 60 * 1000);
    patch.failedLoginAttempts = 0;
  }

  await user.update(patch);
}

async function login({ email, password, req }) {
  // `User`'s default scope hides `passwordHash`, so credential checks must
  // opt back in with the `withPassword` scope.
  const user = await User.scope('withPassword').findOne({
    where: { email: String(email).trim().toLowerCase() },
    include: [{ model: Role, as: 'role' }],
  });

  if (!user) throw AppError.unauthorized('Invalid email or password');

  assertNotLocked(user);

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    await registerFailure(user);
    throw AppError.unauthorized('Invalid email or password');
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw AppError.forbidden(`Account is ${user.status.toLowerCase()}`);
  }

  await user.update({
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
    lastLoginIp: getIp(req),
  });

const tokens = await issueTokens(user, req, transaction);
  return { user: sanitizeUser(user), ...tokens };
}

async function registerPatient({ payload, req }) {
  const email = String(payload.email).trim().toLowerCase();

  const existing = await User.findOne({ where: { email } });
  if (existing) throw AppError.conflict('An account with this email already exists');

  const { nextUniqueHospitalNumber } = require('../utils/codeGenerator');

  return sequelizeTransaction(async (transaction) => {
    const patient = await Patient.create(
      {
        hospitalNumber: await nextUniqueHospitalNumber({ transaction }),
        firstName: payload.firstName,
        lastName: payload.lastName,
        middleName: payload.middleName ?? null,
        dateOfBirth: payload.dateOfBirth ?? null,
        gender: payload.gender ?? null,
        phone: payload.phone ?? null,
        email,
        address: payload.address ?? null,
        city: payload.city ?? null,
        state: payload.state ?? null,
        bloodGroup: payload.bloodGroup ?? null,
        emergencyContactName: payload.emergencyContactName ?? null,
        emergencyContactPhone: payload.emergencyContactPhone ?? null,
        emergencyContactRelationship: payload.emergencyContactRelationship ?? null,
        occupation: payload.occupation ?? null,
      },
      { transaction },
    );

    const role = await Role.findOne({ where: { name: 'PATIENT' }, transaction });
    if (!role) throw AppError.internal('Patient role is not configured');

    const user = await User.create(
      {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email,
        phone: payload.phone ?? null,
        passwordHash: await hashPassword(payload.password),
        roleId: role.id,
        status: USER_STATUS.ACTIVE,
        patientId: patient.id,
        mustChangePassword: false,
      },
      { transaction },
    );

    const tokens = await issueTokens(user, req, transaction);
    return { user: sanitizeUser(user), patient, ...tokens };
  });
}

/** Rotates a refresh token; a replayed token revokes the whole chain. */
async function refresh({ refreshToken, req }) {
  let payload;
  try {
    payload = jwt.verifyRefreshToken(refreshToken);
  } catch (error) {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const stored = await RefreshToken.findOne({ where: { tokenHash: sha256(refreshToken) } });

  if (!stored) throw AppError.unauthorized('Invalid refresh token');

  if (stored.revokedAt) {
    // Re-use of a rotated token means the token leaked: drop every session.
    await RefreshToken.update(
      { revokedAt: new Date(), revokedReason: 'REUSE_DETECTED' },
      { where: { userId: stored.userId, revokedAt: null } },
    );
    throw AppError.unauthorized('Refresh token reuse detected. Please sign in again.');
  }

  if (new Date(stored.expiresAt) < new Date()) {
    throw AppError.unauthorized('Refresh token expired');
  }

  const user = await User.findByPk(stored.userId, { include: [{ model: Role, as: 'role' }] });
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    throw AppError.unauthorized('Account is no longer active');
  }

  const tokens = await issueTokens(user, req);

  await stored.update({
    revokedAt: new Date(),
    revokedReason: 'ROTATED',
    replacedByTokenId: stored.id,
  });

  return { user: sanitizeUser(user), ...tokens };
}

async function logout({ refreshToken, userId }) {
  if (refreshToken) {
    await RefreshToken.update(
      { revokedAt: new Date(), revokedReason: 'LOGOUT' },
      { where: { tokenHash: sha256(refreshToken), userId } },
    );
    return;
  }
  await RefreshToken.update(
    { revokedAt: new Date(), revokedReason: 'LOGOUT' },
    { where: { userId, revokedAt: null } },
  );
}

async function logoutAll(userId) {
  await RefreshToken.update(
    { revokedAt: new Date(), revokedReason: 'LOGOUT_ALL' },
    { where: { userId, revokedAt: null } },
  );
}

async function changePassword({ userId, currentPassword, newPassword, req }) {
  const user = await User.scope('withPassword').findByPk(userId);
  if (!user) throw AppError.notFound('Account not found');

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw AppError.unauthorized('Current password is incorrect');

  await user.update({
    passwordHash: await hashPassword(newPassword),
    mustChangePassword: false,
    passwordChangedAt: new Date(),
  });

  // Every other session must re-authenticate with the new password.
  await RefreshToken.update(
    { revokedAt: new Date(), revokedReason: 'PASSWORD_CHANGED' },
    { where: { userId, revokedAt: null } },
  );

  return { changed: true, ipAddress: getIp(req) };
}

/**
 * Issues a single-use password reset token.
 * The response never reveals whether the email exists.
 */
async function forgotPassword({ email, req }) {
  const user = await User.findOne({ where: { email: String(email).trim().toLowerCase() } });

  if (user && user.status === USER_STATUS.ACTIVE) {
    const token = randomToken(32);
    await PasswordReset.create({
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + parseDurationMs(env.PASSWORD_RESET_EXPIRES_IN)),
      requestedIp: getIp(req),
    });

    // No mail transport is wired up in this project: the token is returned only
    // outside production so the flow can be exercised end to end.
    if (!env.isProduction) {
      return { delivered: true, token };
    }
    return { delivered: true };
  }

  return { delivered: true };
}

async function resetPassword({ token, newPassword, req }) {
  const record = await PasswordReset.findOne({
    where: { tokenHash: sha256(token), usedAt: null, expiresAt: { [Op.gt]: new Date() } },
  });

  if (!record) throw AppError.badRequest('Reset token is invalid or has expired');

  const user = await User.findByPk(record.userId);
  if (!user) throw AppError.badRequest('Reset token is invalid or has expired');

  await user.update({
    passwordHash: await hashPassword(newPassword),
    passwordChangedAt: new Date(),
    mustChangePassword: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
  });

  await record.update({ usedAt: new Date() });
  await RefreshToken.update(
    { revokedAt: new Date(), revokedReason: 'PASSWORD_RESET' },
    { where: { userId: user.id, revokedAt: null } },
  );

  return { reset: true, ipAddress: getIp(req) };
}

async function me(userId) {
  const user = await User.findByPk(userId, {
    include: [
      { model: Role, as: 'role' },
      { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] },
    ],
  });
  if (!user) throw AppError.notFound('Account not found');

  return {
    ...sanitizeUser(user),
    patient: user.patient || null,
    permissions: roleNameOf(user) ? require('../config/permissions').ROLE_PERMISSIONS[roleNameOf(user)] : [],
  };
}

/** `15m`, `7d`, `1h` -> milliseconds. */
function parseDurationMs(value) {
  const match = /^(\d+)\s*(m|h|d|s)?$/i.exec(String(value).trim());
  if (!match) return 60 * 60 * 1000;
  const amount = Number.parseInt(match[1], 10);
  const unit = (match[2] || 'm').toLowerCase();
  const factor = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
  return amount * factor;
}

/** Runs `work` inside a transaction, reusing the shared Sequelize instance. */
function sequelizeTransaction(work) {
  const { sequelize } = require('../config/database');
  return sequelize.transaction(work);
}

module.exports = {
  sanitizeUser,
  login,
  registerPatient,
  refresh,
  logout,
  logoutAll,
  changePassword,
  forgotPassword,
  resetPassword,
  me,
  parseDurationMs,
  safeEquals,
};
