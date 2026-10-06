/**
 * Canonical real-time event names and room helpers.
 *
 * Keeping every event string in one place means the REST layer, the Socket.IO
 * gateway and the frontend can never drift apart, and gives us a single place
 * to document what the hospital platform emits.
 */
const EVENTS = Object.freeze({
  // Appointments
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_RESCHEDULED: 'appointment.rescheduled',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_CHECKED_IN: 'patient.checked_in',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  APPOINTMENT_NO_SHOW: 'appointment.no_show',

  // Queue
  QUEUE_UPDATED: 'queue.updated',
  QUEUE_JOINED: 'queue.joined',
  QUEUE_CALLED: 'queue.called',
  QUEUE_COMPLETED: 'queue.completed',
  QUEUE_SKIPPED: 'queue.skipped',

  // Clinical
  CONSULTATION_STARTED: 'consultation.started',
  CONSULTATION_COMPLETED: 'consultation.completed',
  LAB_RESULT_READY: 'lab.result_ready',
  LAB_ORDER_STATUS: 'lab.order_status',
  IMAGING_REPORT_READY: 'imaging.report_ready',
  PRESCRIPTION_CREATED: 'prescription.created',
  PRESCRIPTION_VERIFIED: 'prescription.verified',
  PRESCRIPTION_DISPENSED: 'prescription.dispensed',

  // Inpatient
  ADMISSION_CREATED: 'admission.created',
  BED_UPDATED: 'bed.updated',
  PATIENT_DISCHARGED: 'patient.discharged',
  VITAL_SIGNS_RECORDED: 'vitals.recorded',

  // Emergency
  EMERGENCY_CREATED: 'emergency.created',
  EMERGENCY_TRIAGED: 'emergency.triaged',
  EMERGENCY_UPDATED: 'emergency.updated',

  // Money
  INVOICE_CREATED: 'invoice.created',
  PAYMENT_COMPLETED: 'payment.completed',

  // Comms
  NOTIFICATION: 'notification',
  MESSAGE_RECEIVED: 'message.received',
  MESSAGE_READ: 'message.read',
});

/* ------------------------------------------------------------------ *
 * Rooms
 * ------------------------------------------------------------------ */
const ROOMS = Object.freeze({
  hospital: () => 'hospital',
  user: (userId) => `user:${userId}`,
  patient: (patientId) => `patient:${patientId}`,
  department: (departmentId) => `department:${departmentId}`,
  appointment: (appointmentId) => `appointment:${appointmentId}`,
  queue: (departmentId, date) => (date ? `queue:${departmentId}:${date}` : `queue:${departmentId}`),
  conversation: (conversationId) => `conversation:${conversationId}`,
});

module.exports = { EVENTS, ROOMS };