/** Date/time helpers shared by models, services and seeders. */

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Midnight (UTC) of the given day - used for "today" queries. */
const startOfDay = (value = new Date()) => {
  const date = toDate(value) || new Date();
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return result;
};

const endOfDay = (value = new Date()) => {
  const start = startOfDay(value);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
};

const addDays = (value, days) => {
  const date = toDate(value) || new Date();
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
};

const addMinutes = (value, minutes) => {
  const date = toDate(value) || new Date();
  return new Date(date.getTime() + minutes * 60 * 1000);
};

/** `YYYY-MM-DD` for DATEONLY columns. */
const toDateOnly = (value = new Date()) => {
  const date = toDate(value) || new Date();
  return date.toISOString().slice(0, 10);
};

const isPast = (value) => {
  const date = toDate(value);
  return date ? date.getTime() < Date.now() : false;
};

const daysBetween = (from, to = new Date()) => {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return null;
  return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
};

/** Whole years between `dateOfBirth` and today. */
function calculateAge(dateOfBirth) {
  const dob = toDate(dateOfBirth);
  if (!dob) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

/** Combines a DATEONLY + `HH:mm` string into a Date. */
const combineDateTime = (dateOnly, time) => {
  const date = toDate(dateOnly);
  if (!date) return null;
  const [hours, minutes] = String(time || '00:00')
    .split(':')
    .map((n) => Number.parseInt(n, 10) || 0);
  const result = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes, 0, 0),
  );
  return result;
};

/** Minutes since midnight for ordering slots. */
const timeToMinutes = (time) => {
  const [hours, minutes] = String(time || '00:00')
    .split(':')
    .map((n) => Number.parseInt(n, 10) || 0);
  return hours * 60 + minutes;
};

module.exports = {
  toDate,
  startOfDay,
  endOfDay,
  addDays,
  addMinutes,
  toDateOnly,
  isPast,
  daysBetween,
  calculateAge,
  combineDateTime,
  timeToMinutes,
};