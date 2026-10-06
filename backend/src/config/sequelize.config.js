/**
 * Configuration consumed by the Sequelize CLI (`sequelize-cli db:migrate`,
 * `db:migrate:undo`, `db:seed:all`, `db:seed:undo:all`).
 *
 * The application itself does not use this file - it connects through
 * `src/config/database.js`. Both read the same `src/config/env.js` settings.
 */
const env = require('./env');

const connectionTimeoutMillis = env.DB_CONNECTION_TIMEOUT_MS || 30000;

/**
 * Optional self-signed CA (Aiven's `ca.pem`). When present we verify the chain
 * ourselves and require `rejectUnauthorized`; otherwise the flag comes from
 * `DB_SSL_REJECT_UNAUTHORIZED`.
 */
function buildSsl() {
  if (!env.DB_SSL) return undefined;
  const ca = process.env.DB_CA_CERT;
  return {
    require: true,
    rejectUnauthorized: ca ? true : env.DB_SSL_REJECT_UNAUTHORIZED,
    ...(ca ? { ca } : {}),
  };
}

const shared = {
  dialect: 'postgres',
  seederStorage: 'sequelize',
  seederStorageTableName: 'sequelize_seed_meta',
  migrationStorageTableName: 'sequelize_meta',
  migrationTableName: 'sequelize_meta',
  logging: env.DB_LOGGING ? console.log : false,
  define: {
    underscored: true,
    freezeTableName: true,
  },
  pool: {
    max: env.DB_POOL_MAX,
    min: env.DB_POOL_MIN,
    idle: env.DB_POOL_IDLE,
    acquire: env.DB_POOL_ACQUIRE,
  },
};

/**
 * The CLI constructs `new Sequelize(database, username, password, options)`, so
 * it needs discrete `host`/`username`/`password` fields. Returning a `url` key
 * instead makes it drop `dialect` and fail with
 * "Dialect needs to be explicitly supplied as of v4.0.0".
 */
const connection = () => {
  const dialectOptions = { connectionTimeoutMillis, keepAlive: true };
  const ssl = buildSsl();
  if (ssl) dialectOptions.ssl = ssl;

  const source = env.database.databaseUrl;

  if (!source) {
    return {
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
      username: env.database.username,
      password: env.database.password,
      dialectOptions,
    };
  }

  const parsed = new URL(source);
  const read = (value) => (value ? decodeURIComponent(value) : '');

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    database: read(parsed.pathname.replace(/^\//, '')),
    username: read(parsed.username),
    password: read(parsed.password),
    dialectOptions,
  };
};

module.exports = {
  development: { ...shared, ...connection() },
  test: { ...shared, ...connection() },
  production: { ...shared, ...connection() },
};