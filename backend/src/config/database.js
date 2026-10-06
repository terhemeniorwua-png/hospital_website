const { Sequelize } = require('sequelize');

/**
 * Removes connection-string parameters that would fight with the explicit
 * `ssl` object we hand to node-postgres (`sslmode=require` makes node-postgres
 * verify the certificate chain, which then overrides `rejectUnauthorized`).
 */
function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    ['sslmode', 'ssl', 'sslcert', 'sslkey', 'sslrootcert'].forEach((key) => url.searchParams.delete(key));
    return url.toString();
  } catch (error) {
    return rawUrl;
  }
}

/**
 * Builds the Sequelize dialect options from `src/config/env.js`.
 * Supports both `DATABASE_URL` and discrete DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD.
 */
function buildOptions(extra = {}) {
  const env = require('./env');
  const ca = process.env.DB_CA_CERT;
  const ssl = env.DB_SSL
    ? {
        require: true,
        rejectUnauthorized: ca ? true : env.DB_SSL_REJECT_UNAUTHORIZED,
        ...(ca ? { ca } : {}),
      }
    : false;

  const connectionTimeoutMillis = env.DB_CONNECTION_TIMEOUT_MS || 30000;

  const base = {
    dialect: 'postgres',
    logging: env.DB_LOGGING ? (sql) => console.log(`[sql] ${sql}`) : false,
    define: {
      underscored: true,
      freezeTableName: true,
      timestamps: true,
    },
    pool: {
      max: env.DB_POOL_MAX,
      min: env.DB_POOL_MIN,
      idle: env.DB_POOL_IDLE,
      acquire: env.DB_POOL_ACQUIRE,
    },
    ...extra,
  };

  const dialectOptions = { connectionTimeoutMillis, keepAlive: true };
  if (ssl) dialectOptions.ssl = ssl;

  if (env.database.databaseUrl) {
    return { ...base, url: normalizeUrl(env.database.databaseUrl), dialectOptions };
  }

  return {
    ...base,
    host: env.database.host,
    port: env.database.port,
    database: env.database.name,
    username: env.database.username,
    password: env.database.password,
    dialectOptions,
  };
}

const { url, ...options } = buildOptions();
const sequelize = url ? new Sequelize(url, options) : new Sequelize(options);

/**
 * Verifies the connection, retrying transient network failures (cloud Postgres
 * providers occasionally drop a fresh connection) before giving up.
 */
async function connectWithRetry(attempts = 3, delayMs = 1500) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await sequelize.authenticate();
      return true;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

module.exports = { sequelize, Sequelize, buildOptions, connectWithRetry };