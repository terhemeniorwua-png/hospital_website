const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/jwt');
const { getIp } = require('../utils/requestInfo');
const { User, Role } = require('../models');

/** Pulls a bearer token from the Authorization header (or `?access_token=`). */
function extractToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (header && typeof header === 'string') {
    const [scheme, value] = header.split(' ');
    if (/^Bearer$/i.test(scheme) && value) return value.trim();
    // Tolerate a bare token, which some clients send.
    if (!value && scheme) return scheme.trim();
  }
  if (req.query && typeof req.query.access_token === 'string') return req.query.access_token;
  return null;
}

/**
 * JWT authentication middleware.
 * Verifies the access token, loads the user (so role changes and account
 * suspension take effect immediately) and attaches `req.user`.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw AppError.unauthorized('Authentication token is missing');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Access token expired');
    }
    throw AppError.unauthorized('Invalid authentication token');
  }

  if (payload.type !== 'access') throw AppError.unauthorized('Invalid authentication token');

  const user = await User.findByPk(payload.sub, {
    include: [{ model: Role, as: 'role' }],
  });

  if (!user) throw AppError.unauthorized('Account no longer exists');
  if (user.status === 'SUSPENDED') throw AppError.forbidden('Account is suspended');
  if (user.status === 'INACTIVE') throw AppError.forbidden('Account is inactive');
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw AppError.forbidden('Account is temporarily locked');
  }

  // `roleName` keeps downstream RBAC checks independent of how the Role
  // association was loaded.
  user.roleName = user.role ? user.role.name : undefined;

  req.user = user;
  req.auth = payload;
  req.token = token;
  req.clientIp = getIp(req);
  return next();
});

/** Attaches `req.user` when a valid token is present but never blocks. */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findByPk(payload.sub, { include: [{ model: Role, as: 'role' }] });
    if (user && user.status === 'ACTIVE') {
      req.user = user;
      req.auth = payload;
      req.token = token;
    }
  } catch (error) {
    // ignore - optional auth
  }
  return next();
});

module.exports = { authenticate, optionalAuth, extractToken };