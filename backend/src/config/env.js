/**
 * Environment configuration loader.
 *
 * Rules:
 *  - `backend/.env` is the single source of truth for backend settings.
 *  - `frontend/.env.local` (repo path: `src/.env.local`) is READ-ONLY.
 *    It is only ever *read* (via fs.readFileSync) as a fallback source of the
 *    database connection string, and it is NEVER written, truncated or modified.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(ROOT, '..');

dotenv.config({ path: path.join(ROOT, '.env') });

/** Read-only lookup of a variable from a .env file outside the backend folder. */
function readOnlyEnvLookup(filePath, keys) {
  if (!fs.existsSync(filePath)) return {};
  let parsed;
  try {
    parsed = dotenv.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return {};
  }
  const out = {};
  for (const key of keys) {
    if (parsed[key] !== undefined && String(parsed[key]).trim() !== '') {
      out[key] = parsed[key].trim();
    }
  }
  return out;
}

const FRONTEND_ENV_CANDIDATES = [
  path.join(REPO_ROOT, 'frontend', '.env.local'),
  path.join(REPO_ROOT, 'src', '.env.local'),
];

const DB_FALLBACK_KEYS = ['DATABASE_URL', 'NEXT_API_URL', 'POSTGRES_URL'];

let frontendDbValues = {};
for (const candidate of FRONTEND_ENV_CANDIDATES) {
  const found = readOnlyEnvLookup(candidate, DB_FALLBACK_KEYS);
  if (found.DATABASE_URL || found.NEXT_API_URL || found.POSTGRES_URL) {
    frontendDbValues = found;
    break;
  }
}

/**
 * Accepts the usual boolean spellings plus sslmode-style values
 * (`DB_SSL=require`), so a truthy-but-unlisted value cannot silently disable
 * SSL. Everything except an explicit negative is treated as true.
 */
function parseBool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(normalized);
}

function parseInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseList(value, fallback = []) {
  if (!value) return fallback;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Allowed browser origins for CORS: `CORS_ORIGINS` plus `CLIENT_URL`.
 *
 * Each comma-separated entry is trimmed, stripped of trailing slashes and
 * empty entries dropped, so `https://site.vercel.app/` and
 * `https://site.vercel.app` are treated as the same origin. CLIENT_URL is
 * always added when it is set, because that is the origin the site is
 * genuinely served from; without it a single mis-set CORS_ORIGINS locks the
 * frontend out entirely.
 */
function parseOrigins(value) {
  const strip = (item) => item.replace(/\/+$/, '');
  const fromList = parseList(value).map(strip).filter(Boolean);
  const clientUrl = strip(String(process.env.CLIENT_URL || '').trim());
  const origins = [...new Set(clientUrl ? [...fromList, clientUrl] : fromList)];
  // Preserve the original localhost default when nothing is configured.
  return origins.length ? origins : ['http://localhost:3000'];
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

const FRONTEND_DB_URL =
  frontendDbValues.DATABASE_URL || frontendDbValues.NEXT_API_URL || frontendDbValues.POSTGRES_URL || null;

/**
 * Resolves database settings.
 *
 * `DB_PROVIDER` selects between the local development cluster and the cloud
 * instance without editing any other value:
 *   local (default) -> DATABASE_URL
 *   cloud          -> CLOUD_DATABASE_URL (falls back to DATABASE_URL)
 *
 * When neither URL is configured the connection string from the read-only
 * frontend env file is used, and finally the discrete DB_* variables.
 */
function resolveDatabase() {
  const provider = (process.env.DB_PROVIDER || 'local').toLowerCase();
  const localUrl = process.env.DATABASE_URL || null;
  const cloudUrl = process.env.CLOUD_DATABASE_URL || process.env.DATABASE_URL_CLOUD || null;

  const databaseUrl =
    provider === 'cloud' ? cloudUrl || localUrl || FRONTEND_DB_URL : localUrl || (cloudUrl ? null : FRONTEND_DB_URL);

  if (databaseUrl) return { provider, databaseUrl };

  return {
    provider,
    databaseUrl: null,
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 5432),
    name: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
}

const database = resolveDatabase();

const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1', '[::1]'];
const targetHost = database.databaseUrl
  ? (() => {
      try {
        return new URL(database.databaseUrl).hostname;
      } catch (error) {
        return null;
      }
    })()
  : database.host;
const usesLocalDatabase = LOCAL_HOSTS.includes(targetHost);

const env = {
  NODE_ENV,
  isProduction,
  isTest: NODE_ENV === 'test',

  PORT: parseInt(process.env.PORT, 5100),
  HOST: process.env.HOST || '0.0.0.0',
  API_PREFIX: process.env.API_PREFIX || '/api',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  CORS_ORIGINS: parseOrigins(process.env.CORS_ORIGINS),

  database,
  dbSource: database.databaseUrl
    ? database.provider === 'cloud'
      ? 'backend/.env:CLOUD_DATABASE_URL'
      : 'backend/.env:DATABASE_URL'
    : FRONTEND_DB_URL
      ? 'frontend/.env.local (read-only)'
      : 'backend/.env:DB_*',

  // A local cluster is plain TCP; SSL only makes sense for the cloud provider,
  // whose certificate chain is not in the public trust store by default.
  DB_SSL: parseBool(process.env.DB_SSL, !usesLocalDatabase),
  // Cloud Postgres providers commonly use a certificate chain that is not in the
  // public trust store. Keep this true outside local development.
  DB_SSL_REJECT_UNAUTHORIZED: parseBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, false),
  DB_LOGGING: parseBool(process.env.DB_LOGGING, false),
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX, 10),
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN, 0),
  DB_POOL_IDLE: parseInt(process.env.DB_POOL_IDLE, 10000),
  DB_POOL_ACQUIRE: parseInt(process.env.DB_POOL_ACQUIRE, 60000),
  DB_CONNECTION_TIMEOUT_MS: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS, 30000),

  JWT_SECRET: process.env.JWT_SECRET || 'insecure_dev_access_secret_change_me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'insecure_dev_refresh_secret_change_me',
  JWT_ISSUER: process.env.JWT_ISSUER || 'hospital-management-api',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  BCRYPT_SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS || process.env.BCRYPT_SALT_ROUNDS, 10),
  PASSWORD_RESET_EXPIRES_IN: process.env.PASSWORD_RESET_EXPIRES_IN || '1h',
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 5),
  ACCOUNT_LOCK_MINUTES: parseInt(process.env.ACCOUNT_LOCK_MINUTES, 15),

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 500),
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 20),

  HOSPITAL_NUMBER_PREFIX: process.env.HOSPITAL_NUMBER_PREFIX || 'HOSP',
  HOSPITAL_NUMBER_YEAR: parseInt(process.env.HOSPITAL_NUMBER_YEAR, new Date().getFullYear()),
  CURRENCY: process.env.CURRENCY || 'NGN',
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE, 20),
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE, 100),

  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(ROOT, 'uploads'),
  MAX_UPLOAD_SIZE_MB: parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10),

  JOB_INTERVALS_ENABLED: parseBool(process.env.JOB_INTERVALS_ENABLED, true),
  EXPIRY_WARNING_DAYS: parseInt(process.env.EXPIRY_WARNING_DAYS, 90),

  frontendEnvLoadedFrom: FRONTEND_ENV_CANDIDATES.find((file) => fs.existsSync(file)) || null,

  get usesLocalDatabase() {
    return usesLocalDatabase;
  },
};

if (isProduction) {
  const insecure = [
    !process.env.JWT_SECRET || env.JWT_SECRET.startsWith('insecure_'),
    !process.env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.startsWith('insecure_'),
  ];
  if (insecure.some(Boolean)) {
    // eslint-disable-next-line no-console
    console.warn('[config] WARNING: insecure default JWT secrets detected in production.');
  }
}

module.exports = env;