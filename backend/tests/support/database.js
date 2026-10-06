const fs = require('fs');
const path = require('path');

/**
 * Restores the real database settings from `backend/.env`, which
 * `tests/setup.js` deliberately breaks for the unit suites. `DATABASE_URL` is
 * the authoritative value because `config/env` prefers it over `DB_*`.
 */
function restoreDatabaseEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return false;

  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    const key = match[1];
    if (key !== 'DATABASE_URL' && !key.startsWith('DB_')) continue;
    process.env[key] = match[2].replace(/^["']|["']$/g, '');
  }
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Opens a connection for the database-backed suites, or returns `null` when the
 * seeded database is not reachable so the suite can skip itself.
 */
async function connectDatabase() {
  if (!restoreDatabaseEnv()) return null;

  try {
    // eslint-disable-next-line global-require
    const { sequelize } = require('../../src/config/database');
    await sequelize.authenticate({ timeout: 3000 });
    return sequelize;
  } catch {
    return null;
  }
}

async function disconnectDatabase(sequelize) {
  if (sequelize) await sequelize.close();
}

/** Convenience wrapper for one-shot use. */
async function withDatabase(run) {
  const sequelize = await connectDatabase();
  if (!sequelize) return false;
  try {
    await run(sequelize);
  } finally {
    await disconnectDatabase(sequelize);
  }
  return true;
}

module.exports = { connectDatabase, disconnectDatabase, withDatabase };