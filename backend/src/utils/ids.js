/**
 * Id helpers.
 *
 * Every primary/foreign key in the schema is a UUID, so ids are compared as
 * strings. A missing id (`null`/`undefined`) never equals another id - the old
 * numeric code relied on `NaN !== NaN` for that, which a plain `===` would
 * silently turn into an authorisation hole.
 */

/** True only when both values resolve to the same id. */
function sameId(a, b) {
  return a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);
}

/** `null` for a missing id, otherwise the id as a string. */
function idOf(value) {
  return value === null || value === undefined || value === '' ? null : String(value);
}

/** Stringifies every id in a list, dropping empties. */
function idList(values) {
  return (Array.isArray(values) ? values : []).map(idOf).filter(Boolean);
}

module.exports = { sameId, idOf, idList };
