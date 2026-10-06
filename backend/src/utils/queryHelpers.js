const { Op, where, fn, col } = require('sequelize');

/**
 * Builds a case-insensitive `WHERE` fragment for `?search=`.
 * @param {Array<[string, string]>} fields pairs of [columnName, op]
 */
function searchWhere(search, fields) {
  if (!search) return undefined;
  const term = String(search).trim();
  if (!term) return undefined;

  const parts = fields.map(([column, type = 'string'], index) => {
    if (type === 'number') {
      const value = Number(term);
      if (!Number.isFinite(value)) return null;
      return fn('CAST', col(column), 'text').toLowerCase().like(`%${value}%`);
    }
    return where(col(column), { [Op.iLike]: `%${term}%` });
  });

  const valid = parts.filter(Boolean);
  if (!valid.length) return undefined;
  return valid.length === 1 ? valid[0] : { [Op.or]: valid };
}

/** Merges an array of WHERE fragments, dropping undefined ones. */
const combineWhere = (...clauses) => {
  const valid = clauses.filter(Boolean);
  if (!valid.length) return undefined;
  if (valid.length === 1) return valid[0];
  return { [Op.and]: valid };
};

module.exports = { searchWhere, combineWhere, Op };