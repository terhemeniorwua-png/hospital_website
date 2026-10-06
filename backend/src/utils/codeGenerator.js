const crypto = require('crypto');
const { Op } = require('sequelize');
const env = require('../config/env');
const { ROLES } = require('../config/constants');
const { Patient } = require('../models');

/**
 * Generates human friendly, collision resistant business identifiers.
 * Format examples: HOSP-2026-000001, APT-2026-000042, INV-2026-000017
 */

const pad = (value, width = 6) => String(value).padStart(width, '0');

/** Opaque token (password resets, refresh tokens, invite codes). */
const randomToken = (bytes = 48) => crypto.randomBytes(bytes).toString('hex');

/** Deterministic, idempotent identifier from a sequence counter. */
const numbered = (prefix, sequence, year = env.HOSPITAL_NUMBER_YEAR) => `${prefix}-${year}-${pad(sequence)}`;

/** Clinic day + a per-day queue sequence, e.g. A-001 */
const queueTicket = (letter, sequence) => `${letter}-${pad(sequence, 3)}`;

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const hospitalNumberPrefix = env.HOSPITAL_NUMBER_PREFIX;

/**
 * Next hospital number, e.g. `HOSP-2026-000007`.
 *
 * The sequence is derived from the highest number already stored for the year
 * rather than a counter row, so it keeps working after a restore. The unique
 * index on `patients.hospital_number` is the final guard; callers retry through
 * `nextUniqueHospitalNumber`.
 */
async function nextHospitalNumber(year = env.HOSPITAL_NUMBER_YEAR, options = {}) {
  
  const prefix = `${hospitalNumberPrefix}-${year}-`;
  const last = await Patient.findOne({
    where: { hospitalNumber: { [Op.like]: `${prefix}%` } },
    order: [['hospitalNumber', 'DESC']],
    attributes: ['hospitalNumber'],
    ...options,
  });

  const lastSequence = last ? Number.parseInt(String(last.hospitalNumber).slice(prefix.length), 10) : 0;
  const next = Number.isNaN(lastSequence) ? 1 : lastSequence + 1;
  return `${prefix}${pad(next)}`;
}

/**
 * `nextHospitalNumber` with a bounded number of attempts, for the (very rare)
 * case of two registrations racing for the same number.
 */
async function nextUniqueHospitalNumber(options = {}, attempts = 5) {
  const year = env.HOSPITAL_NUMBER_YEAR;
  const prefix = `${hospitalNumberPrefix}-${year}-`;
  const first = await nextHospitalNumber(year, options);
  const firstSequence = Number.parseInt(first.slice(prefix.length), 10) || 1;
  console.error('hospital number first candidate:', first, 'prefix:', prefix);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = `${prefix}${pad(firstSequence + attempt)}`;
    // eslint-disable-next-line no-await-in-loop
    const taken = await Patient.findOne({
      where: { hospitalNumber: candidate },
      attributes: ['id'],
      transaction: options.transaction,
    });
    if (!taken) return candidate;
    console.error('hospital number already taken:', candidate);
  }
  throw new Error('Unable to allocate a unique hospital number');
}

const prefixFor = {
  patient: (year = env.HOSPITAL_NUMBER_YEAR) => `${hospitalNumberPrefix}-${year}`,
  appointment: () => 'APT',
  invoice: () => 'INV',
  labOrder: () => 'LAB',
  prescription: () => 'RX',
  claim: () => 'CLM',
  admission: () => 'ADM',
  document: () => 'DOC',
};

module.exports = {
  pad,
  randomToken,
  numbered,
  queueTicket,
  sha256,
  hospitalNumberPrefix,
  prefixFor,
  nextHospitalNumber,
  nextUniqueHospitalNumber,
  ROLES,
};
