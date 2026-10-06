import { api } from '../api/client';

/**
 * Appointment endpoints.
 *
 * Booking contract (verified against backend/src/validators/appointment.validator.js):
 *   POST /appointments/  { patientId, doctorId, departmentId, appointmentDate,
 *                          slotId, startTime, type, reason, notes, fee, autoConfirm }
 *
 * Availability: GET /appointments/availability?doctorId=&date=
 *   -> { doctor, date, slots: [{ id, startTime, endTime, status, isAvailable, appointmentId }] }
 *
 * Doctor directory: GET /appointments/doctors -> [{ id, name, specialization,
 *   subSpecialization, consultationFee, slotDurationMinutes, isOnDuty, user }]
 */

export const APPOINTMENT_TYPES = [
  { value: 'NEW', label: 'First visit' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'ROUTINE', label: 'Routine check' },
  { value: 'SPECIALIST', label: 'Specialist review' },
  { value: 'EMERGENCY', label: 'Urgent' },
];

export const APPOINTMENT_STATUS_META = {
  SCHEDULED: { label: 'Scheduled', tone: 'primary' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  CHECKED_IN: { label: 'Checked in', tone: 'teal' },
  IN_PROGRESS: { label: 'In progress', tone: 'warning' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  NO_SHOW: { label: 'No-show', tone: 'danger' },
  RESCHEDULED: { label: 'Rescheduled', tone: 'muted' },
};

export async function listAppointments(query) {
  return api.get('/appointments/', { query });
}

export async function getAppointment(id) {
  return api.get(`/appointments/${id}`);
}

export async function listAvailableDoctors(query) {
  return api.get('/appointments/doctors', { query });
}

export async function getAvailability({ doctorId, date }) {
  return api.get('/appointments/availability', { query: { doctorId, date } });
}

export async function listAppointmentStatuses() {
  return api.get('/appointments/statuses', { auth: false });
}

export async function bookAppointment(payload) {
  return api.post('/appointments/', payload);
}

export async function cancelAppointment(id, reason) {
  return api.post(`/appointments/${id}/cancel`, { reason });
}

export async function confirmAppointment(id, reason) {
  return api.post(`/appointments/${id}/confirm`, { reason });
}

export async function checkInAppointment(id, reason) {
  return api.post(`/appointments/${id}/check-in`, { reason });
}

export async function getFollowUps(query) {
  return api.get('/appointments/follow-ups', { query });
}

export async function getPatientHistory(patientId, query) {
  return api.get(`/appointments/patient/${patientId}/history`, { query });
}

/* ------------------------------------------------------------------ *
 * Department resolution
 * ------------------------------------------------------------------ *
 *
 * `POST /appointments/` requires `departmentId`, but the doctor directory never
 * returns it and `GET /departments` needs `departments:read`, which the PATIENT
 * role does not have. The service would happily fall back to the doctor's own
 * department, but the request validator rejects the payload before it gets
 * there, so the client has to supply the id itself.
 *
 * `GET /appointments/doctors?departmentId=N` is the one endpoint a patient can
 * call that reveals the mapping: it returns every doctor in department N. One
 * sweep therefore resolves every bookable doctor at once, and the result is
 * cached because department membership changes rarely.
 */

const DEPARTMENT_CACHE_KEY = 'sa.doctorDepartments.v1';
const DEPARTMENT_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const DEPARTMENT_SCAN_LIMIT = 60;

let departmentScan = null;

function readDepartmentCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DEPARTMENT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > DEPARTMENT_CACHE_TTL_MS) return null;
    return parsed.map || null;
  } catch {
    return null;
  }
}

function writeDepartmentCache(map) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEPARTMENT_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), map }));
  } catch {
    /* storage unavailable - the in-memory promise still de-duplicates this session */
  }
}

/**
 * Builds `{ [doctorId]: departmentId }` by asking which doctors sit in each
 * department. Concurrent callers share a single in-flight sweep.
 *
 * @returns {Promise<Record<string, number>>}
 */
export function resolveDoctorDepartments() {
  if (typeof window === 'undefined') return Promise.resolve({});

  const cached = readDepartmentCache();
  if (cached) return Promise.resolve(cached);
  if (departmentScan) return departmentScan;

  departmentScan = (async () => {
    const map = {};
    const ids = Array.from({ length: DEPARTMENT_SCAN_LIMIT }, (_, index) => index + 1);
    const BATCH_SIZE = 10;

    for (let start = 0; start < ids.length; start += BATCH_SIZE) {
      const batch = ids.slice(start, start + BATCH_SIZE);
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        batch.map((departmentId) =>
          api
            .get('/appointments/doctors', { query: { departmentId, limit: 100 } })
            .then((response) => {
              (response.data || []).forEach((doctor) => {
                if (doctor?.id) map[doctor.id] = departmentId;
              });
            })
            .catch(() => {
              /* an unreadable department simply contributes no doctors */
            }),
        ),
      );
    }

    if (Object.keys(map).length) writeDepartmentCache(map);
    return map;
  })().finally(() => {
    departmentScan = null;
  });

  return departmentScan;
}

/**
 * Looks up the department a doctor works in.
 *
 * @returns {Promise<number|null>} null when the doctor cannot be placed, in
 *   which case the caller must surface the error instead of guessing.
 */
export async function resolveDoctorDepartment(doctorId) {
  if (!doctorId) return null;
  const map = await resolveDoctorDepartments();
  return map[doctorId] ?? null;
}