import { api } from '../api/client';

/**
 * Consultations = the clinical encounter record (SOAP notes).
 *
 * GET    /consultations/:id                 -> { data: Consultation }
 * POST   /consultations/                    -> start an encounter
 * PUT    /consultations/:id                 -> update the note
 * POST   /consultations/:id/complete        -> close the encounter
 *
 * Listing reads live in clinical.js (`getConsultations`,
 * `getConsultationHistory`); this module owns the write side.
 *
 * A consultation carries the full SOAP note: `chiefComplaint`, `symptoms`,
 * `history`, `physicalExamination`, `assessment`, `diagnosisSummary`,
 * `treatmentPlan`, `doctorNotes` - these names come from the backend
 * validator, not from this file.
 *
 * `POST /consultations/` derives `doctorId` from the caller's Doctor row when
 * it is omitted, so a doctor only has to send `patientId`.
 */

export const CONSULTATION_STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'muted' },
  IN_PROGRESS: { label: 'In progress', tone: 'primary' },
  COMPLETED: { label: 'Completed', tone: 'success' },
};

/** Backend SOAP field names, in the order the editor renders them. */
export const SOAP_FIELDS = [
  { key: 'chiefComplaint', label: 'Chief complaint', rows: 2, max: 1000 },
  { key: 'symptoms', label: 'Symptoms', rows: 3, max: 4000 },
  { key: 'history', label: 'History', rows: 3, max: 4000 },
  { key: 'physicalExamination', label: 'Physical examination', rows: 3, max: 4000 },
  { key: 'assessment', label: 'Assessment', rows: 3, max: 4000 },
  { key: 'diagnosisSummary', label: 'Diagnosis summary', rows: 3, max: 4000 },
  { key: 'treatmentPlan', label: 'Treatment plan', rows: 3, max: 4000 },
  { key: 'doctorNotes', label: 'Clinical notes', rows: 4, max: 4000 },
];

export async function getConsultation(id) {
  return api.get(`/consultations/${id}`);
}

/** Starts an encounter. Requires `patientId`; `doctorId` is derived if absent. */
export async function startConsultation(payload) {
  return api.post('/consultations/', payload);
}

export async function updateConsultation(id, payload) {
  return api.put(`/consultations/${id}`, payload);
}

export async function completeConsultation(id, payload) {
  return api.post(`/consultations/${id}/complete`, payload);
}
