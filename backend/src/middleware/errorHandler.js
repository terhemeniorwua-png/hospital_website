const AppError = require('../utils/AppError');
const { failure } = require('../utils/apiResponse');
const env = require('../config/env');
const logger = require('../utils/logger');
const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
const multer = require('multer');

/** 404 handler for unmatched routes. */
const notFound = (req, res) =>
  failure(res, {
    message: `Route ${req.method} ${req.originalUrl} not found`,
    statusCode: 404,
  });

/** Maps well-known library errors onto the standard envelope. */
function normalise(error) {
  if (error instanceof AppError) return error;

  if (error instanceof ValidationError) {
    return AppError.badRequest('Validation failed', {
      errors: (error.errors || []).map((e) => ({ field: e.path, message: e.message })),
    });
  }

  if (error instanceof UniqueConstraintError) {
    const details = (error.errors || []).map((e) => ({ field: e.path, message: e.message }));
    return AppError.conflict('A record with these details already exists', { errors: details });
  }

  if (error instanceof ForeignKeyConstraintError) {
    if (err.name === 'SequelizeForeignKeyConstraintError') {
  console.error('FK violation:', err.table, err.index, JSON.stringify(err.fields), err.parent && err.parent.detail);
}
    return AppError.badRequest('Referenced record does not exist or is still in use', {
      errors: [{ field: 'reference', message: error.message }],
    });
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? `File exceeds the ${env.MAX_UPLOAD_SIZE_MB}MB limit`
        : `Upload failed: ${error.message}`;
    return AppError.badRequest(message, { errors: [{ field: 'file', message: error.message }] });
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return AppError.unauthorized('Invalid or expired authentication token');
  }

  if (error.type === 'entity.parse.failed') {
    return AppError.badRequest('Malformed JSON payload');
  }

  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  const known = normalise(error);
  const appError = known || AppError.internal();

  if (!known || appError.statusCode >= 500) {
    logger.error('request.failed', {
      method: req.method,
      path: req.originalUrl,
      statusCode: appError.statusCode,
      message: error.message,
      stack: env.isProduction ? undefined : error.stack,
    });
  }

  const body = {
    success: false,
    message: appError.message,
    errors: appError.errors || [],
  };
  if (appError.code) body.code = appError.code;
  if (!env.isProduction && appError.details) body.details = appError.details;

  res.status(appError.statusCode).json(body);
}

module.exports = { errorHandler, notFound };