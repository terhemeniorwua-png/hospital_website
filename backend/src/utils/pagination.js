const env = require('../config/env');
const { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } = env;

/**
 * Normalises `?page=&limit=&sort=&order=` and computes Sequelize
 * `limit` / `offset` / `order` fragments.
 */
function getPagination(query = {}) {
  const rawLimit = Number.parseInt(query.limit ?? query.pageSize, 10);
  const rawPage = Number.parseInt(query.page, 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/** Whitelist-driven sort to prevent SQL injection through `sort`. */
function getSort(query = {}, allowed = [], fallback = [['createdAt', 'DESC']]) {
  const sort = query.sort || query.sortBy;
  const order = String(query.order || query.direction || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  if (!sort) return fallback;
  const columns = Array.isArray(sort) ? sort : String(sort).split(',');
  const resolved = columns
    .map((column) => String(column).trim())
    .filter((column) => allowed.includes(column))
    .map((column) => [column, order]);

  return resolved.length ? resolved : fallback;
}

function buildPaginationMeta({ page, limit, total }) {
  const safeTotal = Number(total) || 0;
  return {
    page,
    limit,
    total: safeTotal,
    totalPages: limit > 0 ? Math.ceil(safeTotal / limit) : 0,
  };
}

/** Removes an `id` from a list of allowed sort columns. */
const withSortable = (base, ...extra) => Array.from(new Set([...base, ...extra.flat()]));

module.exports = { getPagination, getSort, buildPaginationMeta, withSortable };