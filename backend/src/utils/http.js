const { list: sendListResponse, success: sendSuccess, created: sendCreated, noContent } = require('./apiResponse');

/**
 * Small request/response helpers shared by every controller.
 *
 * `middleware/validate` writes coerced query values to `req.validatedQuery`
 * (never mutating `req.query`, which Express 5 exposes as a getter) and
 * sanitised bodies/params onto `req.body` / `req.params`.
 */

/** Validated query object, falling back to the raw query for unvalidated routes. */
const queryOf = (req) => req.validatedQuery ?? req.query ?? {};

/** Validated body object. */
const bodyOf = (req) => req.body ?? {};

/** Route params. */
const paramsOf = (req) => req.params ?? {};

/** `?page=&limit=&sort=&order=` meta built from a service `pagination` block. */
const paginationOf = (result) => result?.pagination ?? null;

/**
 * Services return `{ <collection>: rows, pagination }` with a domain-specific
 * key (`patients`, `invoices`, `staff`, ...). Resolves that key so controllers
 * do not have to repeat it, while still allowing an explicit override.
 */
function collectionOf(result, key) {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== 'object') return [];
  if (key) return Array.isArray(result[key]) ? result[key] : [];
  const candidates = Object.keys(result).filter(
    (name) => name !== 'pagination' && name !== 'meta' && Array.isArray(result[name]),
  );
  if (candidates.length === 1) return result[candidates[0]];
  return candidates.length ? candidates.flatMap((name) => result[name]) : [];
}

/** Sends a service list result using the standard list envelope. */
const sendList = (res, result, { message = 'Records retrieved', key } = {}) =>
  sendListResponse(res, { data: collectionOf(result, key), pagination: result?.pagination, message });

module.exports = {
  queryOf,
  bodyOf,
  paramsOf,
  paginationOf,
  collectionOf,
  sendList,
  sendSuccess,
  sendCreated,
  noContent,
};