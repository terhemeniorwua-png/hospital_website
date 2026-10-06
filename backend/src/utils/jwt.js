const jwt = require('jsonwebtoken');
const env = require('../config/env');

/** Signs a short lived access token. */
function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role,
      roleId: user.roleId,
      type: 'access',
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN, issuer: env.JWT_ISSUER },
  );
}

/** Signs a long lived refresh token carrying a unique jti. */
function signRefreshToken(user) {
  return jwt.sign(
    { sub: String(user.id), type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN, issuer: env.JWT_ISSUER },
  );
}

function signPasswordResetToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email, type: 'password_reset' },
    env.JWT_SECRET,
    { expiresIn: env.PASSWORD_RESET_EXPIRES_IN, issuer: env.JWT_ISSUER },
  );
}

const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET, { issuer: env.JWT_ISSUER });
const verifyRefreshToken = (token) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: env.JWT_ISSUER });
const verifyPasswordResetToken = (token) =>
  jwt.verify(token, env.JWT_SECRET, { issuer: env.JWT_ISSUER });

/** Expires-in string -> seconds, used to persist refresh token expiry. */
function refreshTokenTtlSeconds() {
  const value = env.JWT_REFRESH_EXPIRES_IN;
  const match = /^(\d+)([smhd])$/.exec(String(value));
  if (!match) return 7 * 24 * 60 * 60;
  const amount = Number(match[1]);
  const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
  return amount * unit;
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  signPasswordResetToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyPasswordResetToken,
  refreshTokenTtlSeconds,
};