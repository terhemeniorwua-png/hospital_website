import { api } from '../api/client';

/**
 * Clinical record endpoints.
 *
 * GET /medical-records/:patientId/timeline -> { patient, events, counts }
 * GET /medical-records/:patientId/records
 * GET /medical-records/:patientId/summary
 * GET /laboratory/results   (query: status, patientId, ...)
 * GET /imaging/
 * GET /consultations/ , /consultations/patient/:patientId/history
 */

/** Normalises the several event envelopes the timeline mixes into one list. */
export function flattenTimeline(timeline) {
  if (!timeline) return [];
  const groups = [
    ['appointments', timeline.appointments],
    ['consultations', timeline.consultations],
    ['laboratory', timeline.laboratory ?? timeline.laboratoryOrders ?? timeline.labOrders],
    ['imaging', timeline.imaging ?? timeline.imagingStudies],
    ['prescriptions', timeline.prescriptions ?? timeline.pharmacy],
    ['admissions', timeline.admissions],
    ['documents', timeline.documents],
  ];
  return groups.flatMap(([type, items]) =>
    (Array.isArray(items) ? items : []).map((item) => ({ ...item, timelineType: type })),
  );
}

export const TIMELINE_META = {
  appointments: { label: 'Appointment', tone: 'primary', path: (item) => `/appointments/${item.id}` },
  consultations: { label: 'Consultation', tone: 'teal' },
  laboratory: { label: 'Laboratory', tone: 'warning' },
  imaging: { label: 'Imaging', tone: 'primary' },
  prescriptions: { label: 'Prescription', tone: 'success' },
  admissions: { label: 'Admission', tone: 'warning' },
  documents: { label: 'Document', tone: 'muted' },
};

export async function getTimeline(patientId) {
  return api.get(`/medical-records/${patientId}/timeline`);
}

export async function getRecords(patientId, query) {
  return api.get(`/medical-records/${patientId}/records`, { query });
}

export async function getLabResults(query) {
  return api.get('/laboratory/results', { query });
}

export async function getLabTests(query) {
  return api.get('/laboratory/tests', { query });
}

export async function getLabOrder(id) {
  return api.get(`/laboratory/${id}`);
}

export async function getImagingStudies(query) {
  return api.get('/imaging/', { query });
}

export async function getConsultations(query) {
  return api.get('/consultations/', { query });
}

export async function getConsultationHistory(patientId, query) {
  return api.get(`/consultations/patient/${patientId}/history`, { query });
}

export const LAB_RESULT_STATUS_META = {
  PENDING: { label: 'Pending', tone: 'warning' },
  IN_PROGRESS: { label: 'In progress', tone: 'primary' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  PUBLISHED: { label: 'Ready', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

/** `results` arrives as an array of analyte rows on a lab order. */
export function labResultRows(order) {
  const rows = order?.results ?? order?.testResults ?? [];
  return Array.isArray(rows) ? rows : [];
}

export function abnormalResult(row) {
  const flag = String(row?.flag || row?.abnormalFlag || row?.interpretation || '').toUpperCase();
  return flag.includes('HIGH') || flag.includes('LOW') || flag.includes('CRITICAL') || flag.includes('ABNORMAL');
}