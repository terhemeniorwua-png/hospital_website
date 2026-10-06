/**
 * Public runtime configuration.
 *
 * Only NEXT_PUBLIC_* variables are readable in the browser bundle, so nothing
 * sensitive can leak through this module. The backend URL is the single source
 * of truth for where requests go; there is no hard-coded fallback to a database
 * or secret of any kind.
 */

const trimSlash = (value) => String(value || '').replace(/\/+$/, '');

const API_URL = trimSlash(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5100/api');

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
  /** localStorage key holding the persisted session tokens. */
  tokenStorageKey: process.env.TOKENSTORAGEKEY,
  /** Window in which concurrent 401s share a single refresh call. */
  refreshLockMs: process.env.REFRESHhLOCKMS,
  /** The backend rejects `limit` above 100 (validated by common.pagination). */
  maxPageSize: 100,
};

export default config;