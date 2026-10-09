import { api } from '../api/client';

/**
 * Laboratory orders (the request side of the lab).
 *
 * Result *rows* already live in clinical.js (`getLabResults`, `labResultRows`)
 * - this module adds the order list and statistics the doctor dashboard needs.
 *
 * GET /laboratory/         -> { data: LaboratoryOrder[], pagination }
 * GET /laboratory/results  -> { data: LaboratoryResult[], pagination }
 * GET /laboratory/statistics -> { data: { counts, ... } }
 *
 * Patients only receive published results; the backend enforces that.
 */

export const LAB_ORDER_STATUS_META = {
  PENDING: { label: 'Pending', tone: 'warning' },
  IN_PROGRESS: { label: 'In progress', tone: 'primary' },
  PROCESSING: { label: 'Processing', tone: 'primary' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

export const LAB_PRIORITY_META = {
  ROUTINE: { label: 'Routine', tone: 'muted' },
  URGENT: { label: 'Urgent', tone: 'warning' },
  STAT: { label: 'STAT', tone: 'danger' },
};

export async function listLabOrders(query) {
  return api.get('/laboratory/', { query });
}

export async function getLabStatistics(query) {
  return api.get('/laboratory/statistics', { query });
}
