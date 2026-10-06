'use client';

import { io } from 'socket.io-client';
import { config } from './config';
import { getTokens } from './api/client';

/**
 * Realtime gateway.
 *
 * The server registers canonical `EVENTS` constants (backend/src/realtime/events.js)
 * and authenticates the handshake with the access token. This module exposes one
 * shared socket plus typed subscribe helpers so components never touch `io()`
 * or raw event strings themselves.
 */

let socket = null;

/**
 * Server-side event names, mirrored 1:1 from backend/src/realtime/events.js.
 * These strings are contract, never invented on the frontend side.
 */
export const SOCKET_EVENTS = {
  // Appointments
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_RESCHEDULED: 'appointment.rescheduled',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_CHECKED_IN: 'patient.checked_in',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  APPOINTMENT_NO_SHOW: 'patient.no_show',

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

  ERROR: 'error',
};

/** Events worth interrupting a signed-in patient with. */
const PATIENT_TOAST_EVENTS = [
  SOCKET_EVENTS.APPOINTMENT_CONFIRMED,
  SOCKET_EVENTS.APPOINTMENT_RESCHEDULED,
  SOCKET_EVENTS.APPOINTMENT_CANCELLED,
  SOCKET_EVENTS.MESSAGE_RECEIVED,
  SOCKET_EVENTS.NOTIFICATION,
  SOCKET_EVENTS.LAB_RESULT_READY,
  SOCKET_EVENTS.IMAGING_REPORT_READY,
  SOCKET_EVENTS.PRESCRIPTION_DISPENSED,
  SOCKET_EVENTS.PAYMENT_COMPLETED,
];

export function isPatientToastEvent(event) {
  return PATIENT_TOAST_EVENTS.includes(event);
}

/**
 * Connects (or returns the existing connection). Safe to call repeatedly.
 * Returns null when there is no token - the socket is only ever opened for an
 * authenticated session.
 */
export function connectSocket() {
  if (typeof window === 'undefined') return null;
  if (socket?.connected) return socket;

  const tokens = getTokens();
  if (!tokens?.accessToken) return null;

  socket?.close?.();

  socket = io(config.socketUrl, {
    path: '/socket.io',
    autoConnect: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 800,
    auth: { token: tokens.accessToken },
    query: { token: tokens.accessToken },
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.close?.();
  socket = null;
}

/**
 * Subscribes to a list of server events for the lifetime of a component.
 * @returns {() => void} unsubscribe
 */
export function subscribe(events, handler, options = {}) {
  const active = connectSocket();
  if (!active) return () => {};

  const list = Array.isArray(events) ? events : [events];
  list.forEach((event) => active.on(event, handler));

  if (options.immediate !== false && active.connected) {
    handler({ connected: true }, list[0]);
  }

  return () => {
    list.forEach((event) => active.off(event, handler));
  };
}

export function isConnected() {
  return Boolean(socket?.connected);
}