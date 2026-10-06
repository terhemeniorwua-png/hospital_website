/**
 * Configuration consumed by the Sequelize CLI (`sequelize-cli db:migrate`,
 * `db:migrate:undo`, `db:seed:all`, `db:seed:undo:all`).
 *
 * The application itself does not use this file - it connects through
 * `src/config/database.js`. Both read the same `src/config/env.js` settings.
 */
const env = require('./env');

const ssl = env.DB_SSL ? { require: true, rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED } : undefined;
const connectionTimeoutMillis = env.DB_CONNECTION_TIMEOUT_MS || 30000;

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

const connection = () => {
  if (!env.database.databaseUrl) {
    return {
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
      username: env.database.username,
      password: env.database.password,
      dialectOptions: ssl ? { ssl } : undefined,
    };
  }

  // The CLI calls `new Sequelize(database, username, password, options)`, so a
  // bare `url` is not enough: the credentials have to be present as fields too.
  const parsed = new URL(process.env.DATABASE_URL);


  for (const key of ['sslmode', 'ssl', 'sslcert', 'sslkey', 'sslrootcert']) parsed.searchParams.delete(key);
  return {
    url: parsed.toString(),
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    dialectOptions: { connectionTimeoutMillis, keepAlive: true, ...(ssl ? { ssl } : {}) },
  };
};

module.exports = {
  development: { ...shared, ...connection() },
  test: { ...shared, ...connection() },
  production: { ...shared, ...connection() },
};