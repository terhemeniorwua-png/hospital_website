/**
 * Public runtime configuration.
 *
 * Only NEXT_PUBLIC_* variables are readable in the browser bundle, so nothing
 * sensitive can leak through this module. The backend URL is the single source
 * of truth for where requests go; there is no hard-coded fallback to a database
 * or secret of any kind.
 */

const trimSlash = (value) => String(value || '').replace(/\/+$/, '');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!NEXT_PUBLIC_API_URL && IS_PRODUCTION) {
  // console.error rather than throw: throwing here would fail `next build`,
  // while staying silent would ship a bundle pointing at localhost.
  console.error(
    '[config] NEXT_PUBLIC_API_URL is not set in production. ' +
      'Requests will be sent same-origin and the API will not be reached. ' +
      'Set NEXT_PUBLIC_API_URL to your backend origin, e.g. https://YOUR-BACKEND.onrender.com/api',
  );
}

// Localhost is a development convenience only. In production with the variable
// missing we deliberately fall back to '' (same-origin) instead of a URL that
// can never be reached from the user's browser.
const API_URL = trimSlash(NEXT_PUBLIC_API_URL || (IS_PRODUCTION ? '' : 'http://localhost:5100/api'));

export const config = {
  apiUrl: API_URL,
  socketUrl: trimSlash(process.env.NEXT_PUBLIC_SOCKET_URL || API_URL.replace(/\/api$/, '')),
  hospital: {
    name: process.env.NEXT_PUBLIC_HOSPITAL_NAME || 'St. Aurelia Teaching Hospital',
    shortName: 'St. Aurelia',
    phone: process.env.NEXT_PUBLIC_HOSPITAL_PHONE || '+234 700 000 0000',
    emergencyPhone: process.env.NEXT_PUBLIC_HOSPITAL_EMERGENCY_PHONE || '+234 700 000 0001',
    email: process.env.NEXT_PUBLIC_HOSPITAL_EMAIL || 'care@st-aurelia.test',
    address: process.env.NEXT_PUBLIC_HOSPITAL_ADDRESS || '14 Harbour Road, Victoria Island, Lagos',
    city: 'Lagos',
    country: 'Nigeria',
  },
  /**
   * localStorage key holding the persisted session tokens.
   *
   * Was `process.env.TOKENSTORAGEKEY`: not a NEXT_PUBLIC_ name, so Next.js
   * replaces it with `undefined` in the browser bundle and the session was
   * written under the literal key "undefined". This is an internal client
   * constant rather than deployment configuration, so it is a literal.
   */
  tokenStorageKey: 'sa.auth.tokens',
  /**
   * Window in which concurrent 401s share a single refresh call.
   *
   * Was `process.env.REFRESHhLOCKMS` for the same reason (and the name is
   * misspelt), which made the single-flight guard compare against `undefined`.
   */
  refreshLockMs: 8000,
  /** The backend rejects `limit` above 100 (validated by common.pagination). */
  maxPageSize: 100,
};

export default config;