/**
 * Consistent API response envelope helpers (see README "API response format").
 */

const success = (res, { message = 'Request successful', data = null, statusCode = 200, pagination, meta } = {}) => {
  const body = { success: true, message, data };
  if (pagination) body.pagination = pagination;
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

const created = (res, { message = 'Created successfully', data = null, pagination, meta } = {}) =>
  success(res, { message, data, statusCode: 201, pagination, meta });

const list = (res, { data = [], pagination, message = 'Records retrieved', meta } = {}) => {
  const body = { success: true, data };
  if (pagination) body.pagination = pagination;
  if (meta) body.meta = meta;
  return res.status(200).json(body);
};

const noContent = (res) => res.status(204).send();

const failure = (res, { message = 'Something went wrong', statusCode = 500, errors = [], details, code } = {}) => {
  const body = { success: false, message, errors: errors || [] };
  if (details) body.details = details;
  if (code) body.code = code;
  return res.status(statusCode).json(body);
};

module.exports = { success, created, list, noContent, failure };