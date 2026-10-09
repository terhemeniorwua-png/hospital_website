import { api } from '../api/client';

/**
 * Patient queue endpoints.
 *
 * GET /queue/ -> { data: QueueEntry[], pagination }
 * Each entry carries `patientName`, `doctorName`, `status`, `joinedAt`,
 * `estimatedWaitMinutes` and `position` when the backend supplies them.
 */

export const QUEUE_STATUS_META = {
  WAITING: { label: 'Waiting', tone: 'warning' },
  CALLED: { label: 'Called', tone: 'primary' },
  IN_SERVICE: { label: 'In service', tone: 'primary' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  SKIPPED: { label: 'Skipped', tone: 'muted' },
  NO_SHOW: { label: 'No show', tone: 'danger' },
};

export async function listQueue(query) {
  return api.get('/queue/', { query });
}

export async function getQueueBoard(query) {
  return api.get('/queue/board', { query });
}

export async function getQueueStatistics(query) {
  return api.get('/queue/statistics', { query });
}

export async function estimateWait(query) {
  return api.get('/queue/estimate', { query });
}

/* ------------------------------------------------------------------ *
 * Actions - all require the `queue:manage` permission.
 * ------------------------------------------------------------------ */

/** Calls the next waiting patient in a department onto a desk. */
export async function callNext({ departmentId, date, ticketNumber } = {}) {
  return api.post('/queue/call-next', { departmentId, date, ticketNumber });
}

export async function startQueueService(id) {
  return api.post(`/queue/${id}/start`, {});
}

export async function completeQueueEntry(id, notes) {
  return api.post(`/queue/${id}/complete`, { notes });
}

export async function skipQueueEntry(id, reason) {
  return api.post(`/queue/${id}/skip`, { reason });
}

/** Minutes a waiting entry has been in the queue, or null. */
export function waitingMinutes(entry) {
  if (!entry?.joinedAt) return null;
  const joined = new Date(entry.joinedAt).getTime();
  if (Number.isNaN(joined)) return null;
  return Math.max(0, Math.floor((Date.now() - joined) / 60000));
}
