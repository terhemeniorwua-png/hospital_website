/**
 * Shared Umzug runner for migrations and seeders.
 *
 * Uses the same engine as `sequelize-cli` (Umzug + SequelizeStorage) but adds
 * connection retrying, which matters when the database is a remote/cloud
 * instance that occasionally drops a fresh connection.
 */
const path = require('path');
const { Sequelize } = require('sequelize');
const Umzug = require('umzug/lib/index.js');

const env = require('../src/config/env');
const logger = require('../src/utils/logger');

const ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_PATH = path.join(ROOT, 'src', 'migrations');
const SEEDERS_PATH = path.join(ROOT, 'src', 'seeders');

const ssl = env.DB_SSL ? { require: true, rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED } : undefined;
const dialectOptions = { connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS || 30000, keepAlive: true };
if (ssl) dialectOptions.ssl = ssl;

const shared = {
  dialect: 'postgres',
  logging: env.DB_LOGGING ? (sql) => console.log(`[sql] ${sql}`) : false,
  pool: { max: 2, min: 0, idle: 10000, acquire: env.DB_POOL_ACQUIRE },
  define: { underscored: true, freezeTableName: true },
};

function createSequelize() {
  if (env.database.databaseUrl) {
    const url = new URL(env.database.databaseUrl);
    for (const key of ['sslmode', 'ssl', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
    return new Sequelize({
      ...shared,
      url: url.toString(),
      host: url.hostname,
      port: url.port ? Number(url.port) : 5432,
      database: decodeURIComponent(url.pathname.replace(/^\//, '')),
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      dialectOptions,
    });
  }

  return new Sequelize({
    ...shared,
    host: env.database.host,
    port: env.database.port,
    database: env.database.name,
    username: env.database.username,
    password: env.database.password,
    dialectOptions,
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function authenticate(sequelize, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await sequelize.authenticate();
      logger.info('db.connected', { source: env.dbSource, host: sequelize.config.host, database: sequelize.config.database });
      return;
    } catch (error) {
      lastError = error;
      const code = error?.parent?.code || error.code || error.name;
      logger.warn('db.connection_retry', { attempt, code });
      if (attempt < attempts) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(1500 * attempt);
      }
    }
  }
  throw lastError;
}

function buildUmzug(sequelize, type) {
  const isSeeder = type === 'seeder';
  return new Umzug({
    // Umzug's built-in Sequelize storage keeps track of applied files.
    storage: 'sequelize',
    storageOptions: { sequelize, tableName: isSeeder ? 'sequelize_seed_meta' : 'sequelize_meta' },
    logging: process.env.DEBUG ? (event) => logger.info('umzug.event', { event: String(event) }) : false,
    migrations: {
      params: [sequelize.getQueryInterface(), Sequelize],
      path: isSeeder ? SEEDERS_PATH : MIGRATIONS_PATH,
      pattern: /\.js$/,
      context: sequelize.getQueryInterface().sequelize,
    },
  });
}

const formatName = (name) => name.replace(/\.js$/, '');

async function run(type, action) {
  const sequelize = createSequelize();
  try {
    await authenticate(sequelize);
    const umzug = buildUmzug(sequelize, type);

    if (action === 'status') {
      const executed = await umzug.executed();
      const pending = await umzug.pending();
      console.log('Executed migrations:');
      executed.forEach((m) => console.log(`  [x] ${formatName(m.file || m.name)}`));
      console.log('Pending migrations:');
      pending.forEach((m) => console.log(`  [ ] ${formatName(m.file || m.name)}`));
      return 0;
    }

    let result;
    switch (action) {
      case 'up':
        result = await umzug.up();
        break;
      case 'down':
        result = await umzug.down();
        break;
      case 'down-all':
        result = await umzug.down({ to: 0 });
        break;
      default:
        throw new Error(`Unknown action "${action}". Use up | down | down-all | status`);
    }

    const items = (Array.isArray(result) ? result : [result]).filter(Boolean);
    const verb = action === 'up' ? 'applied' : 'reverted';
    // Umzug 2 returns `{ path, file, options }` for the migrations it ran.
    const nameOf = (item) =>
      typeof item === 'string' ? item : item.file || item.name || item.migrationName || 'unknown';
    console.log(`\n${items.length} ${type === 'seeder' ? 'seeder(s)' : 'migration(s)'} ${verb}.`);
    items.forEach((item) => console.log(`  ${verb === 'applied' ? '+' : '-'} ${formatName(nameOf(item))}`));
    return 0;
  } catch (error) {
    console.error(`\n${type} ${action} failed: ${error.message}`);
    if (process.env.DEBUG) console.error(error);
    return 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

module.exports = { run };