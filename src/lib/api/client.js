import { config } from '../config';

/**
 * Centralised HTTP client.
 *
 * Every request in the app goes through `apiFetch`. It owns the four things
 * that must never be duplicated across components:
 *
 *  1. the base URL (`config.apiUrl`, includes the backend API prefix)
 *  2. the bearer token, kept in memory + localStorage for session restore
 *  3. automatic access-token refresh on a 401 (single-flight, never a loop)
 *  4. unwrapping the backend's `{ success, message, data, pagination }` envelope
 *     and turning `{ success: false, errors }` into a typed `ApiError`
 */

const TOKEN_KEY = config.tokenStorageKey;
const REFRESH_LOCK_MS = config.refreshLockMs;

export class ApiError extends Error {
  constructor(message, { status = 0, errors = [], code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.code = code;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  /** Field-level messages keyed by field name, for form rendering. */
  get fieldErrors() {
    return (this.errors || []).reduce((acc, item) => {
      if (item?.field) acc[item.field] = item.message;
      return acc;
    }, {});
  }
}

/* ------------------------------------------------------------------ *
 * Token storage
 * ------------------------------------------------------------------ */

export function getTokens() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setTokens(tokens) {
  if (typeof window === 'undefined') return;
  try {
    if (!tokens) window.localStorage.removeItem(TOKEN_KEY);
    else window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  } catch {
    /* storage unavailable (private mode) - session stays in memory only */
  }
}

/* ------------------------------------------------------------------ *
 * Listeners: let the auth provider react to login/logout from anywhere
 * ------------------------------------------------------------------ */

const listeners = new Set();

export function onAuthChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event) {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      /* a listener must never break a request */
    }
  });
}

/* ------------------------------------------------------------------ *
 * Request pipeline
 * ------------------------------------------------------------------ */

let refreshPromise = null;

function joinUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = config.apiUrl;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildQuery(params) {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.filter((v) => v !== undefined && v !== null && v !== '').forEach((v) => search.append(key, v));
      return;
    }
    // The backend validates `limit` and 400s above 100, so clamp instead of
    // letting an over-eager page size break the whole request.
    if (key === 'limit') {
      const limit = Number(value);
      if (Number.isFinite(limit)) search.append(key, String(Math.min(Math.max(limit, 1), config.maxPageSize)));
      return;
    }
    search.append(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Refreshes the access token once, even if many requests fail at the same time. */
async function refreshAccessToken() {
  const tokens = getTokens();
  if (!tokens?.refreshToken) throw new ApiError('Your session has expired', { status: 401 });

  if (refreshPromise && Date.now() - refreshPromise.startedAt < REFRESH_LOCK_MS) {
    return refreshPromise.promise;
  }

  const startedAt = Date.now();
  const promise = fetch(joinUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new ApiError(payload?.message || 'Your session has expired', { status: 401 });
      }
      setTokens({ accessToken: payload.data.accessToken, refreshToken: payload.data.refreshToken });
      emit({ type: 'refreshed', user: payload.data.user });
      return payload.data;
    })
    .finally(() => {
      if (refreshPromise && refreshPromise.startedAt === startedAt) refreshPromise = null;
    });

  refreshPromise = { startedAt, promise };
  return promise;
}

/** Called by the auth provider on logout / hard session loss. */
export function clearSession() {
  setTokens(null);
  emit({ type: 'signed-out' });
}

async function toApiError(response) {
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  return new ApiError(payload.message || `Request failed with status ${response.status}`, {
    status: response.status,
    errors: payload.errors || [],
    code: payload.code,
  });
}

async function parseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 204) return null;
  if (contentType.includes('application/json')) return response.json().catch(() => null);
  return response.text();
}

/**
 * @param {string} path          e.g. '/patients/1'
 * @param {object} options
 * @param {string} [options.method]
 * @param {object} [options.body]        JSON body (FormData is passed through)
 * @param {object} [options.query]       query params
 * @param {object} [options.headers]
 * @param {boolean} [options.auth=true]  send the bearer token
 * @param {boolean} [options.raw]        resolve the full envelope instead of `data`
 * @param {boolean} [options._retried]   internal: prevents refresh loops
 */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body, query, headers = {}, auth = true, raw = false, signal, _retried } = options;
  const url = `${joinUrl(path)}${buildQuery(query)}`;

  const requestHeaders = { Accept: 'application/json', ...headers };
  let payloadBody;

  if (body instanceof FormData) {
    payloadBody = body;
  } else if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
    payloadBody = JSON.stringify(body);
  }

  if (auth) {
    const tokens = getTokens();
    if (tokens?.accessToken) requestHeaders.Authorization = `Bearer ${tokens.accessToken}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: payloadBody,
      signal,
      credentials: 'include',
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('Unable to reach the hospital services. Check your connection and try again.', {
      status: 0,
      errors: [{ field: 'network', message: 'Network request failed' }],
    });
  }

  if (response.status === 401 && auth && !_retried) {
    try {
      await refreshAccessToken();
      return apiFetch(path, { ...options, _retried: true });
    } catch {
      clearSession();
      throw new ApiError('Your session has expired. Please sign in again.', { status: 401 });
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiError((await parseBody(response))?.message || 'Authentication token is missing', { status: 401 });
    }
    throw await toApiError(response);
  }

  const parsed = await parseBody(response);
  if (raw) return parsed;

  // The backend always answers with `{ success, message, data, pagination }`.
  if (parsed && typeof parsed === 'object' && 'success' in parsed) {
    if (!parsed.success) {
      throw new ApiError(parsed.message || 'Request failed', {
        status: response.status,
        errors: parsed.errors || [],
        code: parsed.code,
      });
    }
    return parsed;
  }

  return { success: true, data: parsed };
}

/** Convenience wrappers. */
export const api = {
  get: (path, options) => apiFetch(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiFetch(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiFetch(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => apiFetch(path, { ...options, method: 'PATCH', body }),
  del: (path, options) => apiFetch(path, { ...options, method: 'DELETE' }),
};

export default apiFetch;