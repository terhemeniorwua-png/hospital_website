const bcrypt = require('bcrypt');
const env = require('../config/env');

const SALT_ROUNDS = () => env.BCRYPT_SALT_ROUNDS;

const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS());
const hashSync = (plain) => bcrypt.hashSync(plain, SALT_ROUNDS());

async function comparePassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

/** Constant-time no-op comparison used for opaque token lookups. */
function safeEquals(a, b) {
  return typeof a === 'string' && typeof b === 'string' && a.length === b.length && a === b;
}

module.exports = { hashPassword, hashSync, comparePassword, safeEquals, SALT_ROUNDS };