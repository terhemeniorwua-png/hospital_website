const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const handler = (message) => (req, res, next) => next(AppError.tooManyRequests(message));

/** Broad limiter applied to the whole API surface. */
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: handler('Too many requests, please try again later.'),
});

/** Stricter limiter for credential endpoints (brute-force protection). */
const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => env.isTest,
  handler: handler('Too many authentication attempts, please try again later.'),
});

/** Uploads are expensive; keep them tighter. */
const uploadLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: handler('Upload limit reached, please try again later.'),
});

module.exports = { apiLimiter, authLimiter, uploadLimiter };