import { api } from '../api/client';

/**
 * Pharmacy endpoints.
 *
 * GET /pharmacy/medications -> the medicine catalogue. Verified fields:
 *   { id, code, name, genericName, brandName, form, strength, manufacturer,
 *     unitPrice (string), requiresPrescription, reorderLevel, unitOfMeasure,
 *     storageConditions, isActive }
 * Supported query params on the backend: `search`, `isActive`, pagination only.
 *
 * Stock levels are intentionally NOT exposed here: /pharmacy/inventory requires
 * the staff-only `pharmacy:inventory` permission. The UI therefore never claims
 * a stock count for a patient - see docs/FRONTEND.md for the backend gap.
 *
 * GET /pharmacy/ -> the signed-in patient's prescriptions.
 */

/** Mirrors `PRESCRIPTION_STATUS` in backend/src/config/constants.js. */
export const PRESCRIPTION_STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'muted' },
  PENDING_VERIFICATION: { label: 'Awaiting verification', tone: 'warning' },
  VERIFIED: { label: 'Verified', tone: 'primary' },
  PARTIALLY_DISPENSED: { label: 'Partially dispensed', tone: 'warning' },
  DISPENSED: { label: 'Dispensed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

export async function listMedications(query) {
  return api.get('/pharmacy/medications', { query });
}

export async function listPrescriptions(query) {
  return api.get('/pharmacy/', { query });
}

export async function getPrescription(id) {
  return api.get(`/pharmacy/${id}`);
}

/* ------------------------------------------------------------------ *
 * Client-side catalogue faceting
 * ------------------------------------------------------------------ */

const normalise = (value) => String(value || '').toLowerCase();

export function matchesSearch(medication, term) {
  if (!term) return true;
  const needle = normalise(term);
  return [medication.name, medication.genericName, medication.brandName, medication.manufacturer, medication.form]
    .some((field) => normalise(field).includes(needle));
}

export function matchesCategory(medication, category) {
  if (!category || category === 'all') return true;
  return normalise(medication.form) === normalise(category);
}

export function matchesPrice(medication, range) {
  if (!range) return true;
  const price = Number(medication.unitPrice);
  if (!Number.isFinite(price)) return false;
  if (range === 'under-500' && price >= 500) return false;
  if (range === '500-2000' && (price < 500 || price > 2000)) return false;
  if (range === 'over-2000' && price <= 2000) return false;
  return true;
}

/** Stable category list derived from the loaded catalogue (`form` is the only grouping the backend models). */
export function deriveCategories(medications) {
  return Array.from(new Set(medications.map((m) => m.form).filter(Boolean))).sort();
}

export function medicationCategories(medications) {
  return [
    { key: 'all', label: 'All medicines' },
    ...deriveCategories(medications).map((form) => ({ key: form, label: `${form}s`.replace(/ss$/, 's') })),
  ];
}

export const PRICE_RANGES = [
  { key: '', label: 'Any price' },
  { key: 'under-500', label: 'Under ₦500' },
  { key: '500-2000', label: '₦500 – ₦2,000' },
  { key: 'over-2000', label: 'Above ₦2,000' },
];

export const MEDICATION_SORTS = [
  { key: 'name-asc', label: 'Name (A–Z)', compare: (a, b) => a.name.localeCompare(b.name) },
  { key: 'name-desc', label: 'Name (Z–A)', compare: (a, b) => b.name.localeCompare(a.name) },
  { key: 'price-asc', label: 'Price: low to high', compare: (a, b) => Number(a.unitPrice) - Number(b.unitPrice) },
  { key: 'price-desc', label: 'Price: high to low', compare: (a, b) => Number(b.unitPrice) - Number(a.unitPrice) },
];

/**
 * Applies every catalogue filter locally. The backend only accepts `search`, so
 * category / price / sort are resolved here over the fetched page.
 */
export function filterMedications(medications, { search, category, priceRange, sort } = {}) {
  const sorter = MEDICATION_SORTS.find((option) => option.key === sort);
  return medications
    .filter((medication) => medication.isActive !== false)
    .filter((medication) => matchesSearch(medication, search))
    .filter((medication) => matchesCategory(medication, category))
    .filter((medication) => matchesPrice(medication, priceRange))
    .sort(sorter ? sorter.compare : undefined);
}