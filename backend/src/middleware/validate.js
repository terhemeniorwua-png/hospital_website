const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

/**
 * Zod request validation middleware.
 * `schema` may be `{ body, query, params }` or a single schema for the body.
 * Validated (and coerced) values replace the raw input.
 */
function formatIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.join('.') : '(root)',
    code: issue.code,
    message: issue.message,
  }));
}

function validate(schema) {
  const schemas = schema && (schema.body || schema.query || schema.params) ? schema : { body: schema };

  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      if (schemas.query) req.validatedQuery = schemas.query.parse(req.query ?? {});
      if (schemas.params) req.params = schemas.params.parse(req.params ?? {});
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          AppError.badRequest('Validation failed', { errors: formatIssues(error) }),
        );
      }
      return next(error);
    }
  };
}

module.exports = validate;
module.exports.formatIssues = formatIssues;