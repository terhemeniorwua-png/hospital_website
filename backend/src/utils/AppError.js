/**
 * Application level error with an HTTP status code.
 * Everything thrown by services/controllers should be an AppError so the
 * global error handler can produce a consistent response body.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = options.errors || [];
    this.code = options.code;
    this.details = options.details;
    if (options.cause) this.cause = options.cause;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', options) {
    return new AppError(message, 400, options);
  }

  static unauthorized(message = 'Authentication required', options) {
    return new AppError(message, 401, options);
  }

  static forbidden(message = 'You do not have permission to perform this action', options) {
    return new AppError(message, 403, options);
  }

  static notFound(message = 'Resource not found', options) {
    return new AppError(message, 404, options);
  }

  static conflict(message = 'Resource conflict', options) {
    return new AppError(message, 409, options);
  }

  static unprocessable(message = 'Unprocessable request', options) {
    return new AppError(message, 422, options);
  }

  static tooManyRequests(message = 'Too many requests', options) {
    return new AppError(message, 429, options);
  }

  static internal(message = 'Internal server error', options) {
    return new AppError(message, 500, options);
  }
}

module.exports = AppError;