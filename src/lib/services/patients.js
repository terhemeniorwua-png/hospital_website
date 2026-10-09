import { api } from '../api/client';

/**
 * Patient directory endpoints.
 *
 * Note: the PATIENT role has no `patients:read` permission, so every function
 * here is a staff/doctor capability. A patient's own demographic and clinical
 * data comes from `/medical-records/:patientId/summary` (clinical.js), which
 * the backend scopes to the caller.
 *
 * GET /patients/search -> { data: Patient[], pagination }
 * GET /patients/:id    -> { data: Patient }
 */

export const PATIENT_STATUS_META = {
  ACTIVE: { label: 'Active', tone: 'success' },
  INACTIVE: { label: 'Inactive', tone: 'muted' },
  DECEASED: { label: 'Deceased', tone: 'danger' },
};

/** Directory listing (filters only, no free-text search). */
export async function listPatients(query) {
  return api.get('/patients/', { query });
}

/**
 * Free-text directory search by name or hospital number.
 * The backend accepts `search` (and `q` as an alias) and caps `limit` at 50.
 */
export async function searchPatients(query) {
  return api.get('/patients/search', { query });
}

/** Full patient record. `includeClinical` widens the payload for clinical roles. */
export async function getPatient(id, query) {
  return api.get(`/patients/${id}`, { query });
}

export async function getPatientAllergies(patientId) {
  return api.get(`/patients/${patientId}/allergies`);
}

export async function getPatientConditions(patientId) {
  return api.get(`/patients/${patientId}/conditions`);
}

export async function getPatientHistory(patientId, query) {
  return api.get(`/patients/${patientId}/history`, { query });
}

/** Age in whole years, derived from a DOB the backend returned. */
export function ageFromDob(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

/** "Jane Doe" / "Jane D." - tolerant of partial records. */
export function patientName(patient) {
  if (!patient) return '';
  if (patient.fullName) return patient.fullName;
  const parts = [patient.firstName, patient.lastName].filter(Boolean);
  return parts.join(' ').trim() || patient.hospitalNumber || 'Unknown patient';
}
