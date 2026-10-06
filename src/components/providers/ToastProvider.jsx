'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';
import { SOCKET_EVENTS, subscribe } from '../../lib/socket';
import { useAuth } from './AuthProvider';

/**
 * Toast + realtime context.
 *
 * Browser `alert()` is never used anywhere in this app: every outcome is
 * reported through `toast()`, which renders an accessible live region. The same
 * provider subscribes to the Socket.IO gateway so realtime updates announce
 * themselves here instead of silently changing the UI.
 */

const ToastContext = createContext(null);

const TONE_STYLES = {
  success: 'border-success-100 bg-success-50 text-success-700',
  error: 'border-danger-100 bg-danger-50 text-danger-700',
  warning: 'border-warning-100 bg-warning-50 text-warning-700',
  info: 'border-primary-100 bg-primary-50 text-primary-800',
};

const TONE_ICON = {
  success: 'M20 6 9 17l-5-5',
  error: 'M18 6 6 18M6 6l12 12',
  warning: 'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
  info: 'M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
};

const SOCKET_MESSAGES = {
  [SOCKET_EVENTS.APPOINTMENT_CONFIRMED]: 'Your appointment has been confirmed by the clinic.',
  [SOCKET_EVENTS.APPOINTMENT_RESCHEDULED]: 'Your appointment was rescheduled.',
  [SOCKET_EVENTS.APPOINTMENT_CANCELLED]: 'Your appointment was cancelled.',
  [SOCKET_EVENTS.MESSAGE_RECEIVED]: 'You have a new message from your care team.',
  [SOCKET_EVENTS.NOTIFICATION]: 'You have a new notification.',
  [SOCKET_EVENTS.LAB_RESULT_READY]: 'A laboratory result is ready to view.',
  [SOCKET_EVENTS.LAB_ORDER_STATUS]: 'A laboratory order was updated.',
  [SOCKET_EVENTS.IMAGING_REPORT_READY]: 'An imaging report is ready to view.',
  [SOCKET_EVENTS.PRESCRIPTION_CREATED]: 'A new prescription was added to your record.',
  [SOCKET_EVENTS.PRESCRIPTION_VERIFIED]: 'Your prescription was verified by the pharmacy.',
  [SOCKET_EVENTS.PRESCRIPTION_DISPENSED]: 'Your prescription has been dispensed.',
  [SOCKET_EVENTS.PAYMENT_COMPLETED]: 'Your payment was received.',
  [SOCKET_EVENTS.INVOICE_CREATED]: 'A new invoice was issued.',
  [SOCKET_EVENTS.ADMISSION_CREATED]: 'An admission was created on your record.',
  [SOCKET_EVENTS.PATIENT_DISCHARGED]: 'You have been discharged. Get well soon.',
  [SOCKET_EVENTS.QUEUE_CALLED]: 'You have been called to the consultation room.',
};

export function ToastProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [toasts, setToasts] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const counters = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    ({ title, description, tone = 'info', duration = 5200, action }) => {
      const key = counters.current;
      key.current = (key.current || 0) + 1;
      const id = `toast-${key.current}`;
      setToasts((current) => [...current.slice(-3), { id, title, description, tone, action }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const toast = useMemo(
    () => ({
      push,
      dismiss,
      success: (title, description) => push({ title, description, tone: 'success' }),
      error: (title, description) => push({ title, description, tone: 'error', duration: 7000 }),
      warning: (title, description) => push({ title, description, tone: 'warning' }),
      info: (title, description) => push({ title, description, tone: 'info' }),
    }),
    [push, dismiss],
  );

  /* Realtime announcements while a session is live. */
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const handleEvent = (payload, event) => {
      const message = SOCKET_MESSAGES[event];
      if (!message) return;
      push({
        title: 'Live update',
        description: payload?.appointment?.appointmentDate ? message : message,
        tone: event === SOCKET_EVENTS.APPOINTMENT_CANCELLED ? 'warning' : 'info',
      });
      if (event === SOCKET_EVENTS.MESSAGE_RECEIVED) {
        setUnreadMessages((count) => count + 1);
      }
    };

    return subscribe(Object.keys(SOCKET_MESSAGES), handleEvent);
  }, [isAuthenticated, user?.id, push]);

  const resetUnreadMessages = useCallback(() => setUnreadMessages(0), []);

  const value = useMemo(
    () => ({ toast, toasts, dismiss, unreadMessages, resetUnreadMessages }),
    [toast, toasts, dismiss, unreadMessages, resetUnreadMessages],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        role="region"
        aria-label="Notifications"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => (
            <ToastCard key={item.id} toast={item} onDismiss={dismiss} reduceMotion={reduceMotion} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss, reduceMotion }) {
  return (
    <motion.div
      layout={!reduceMotion}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-lg border p-4 shadow-lift backdrop-blur',
        TONE_STYLES[toast.tone] || TONE_STYLES.info,
      )}
    >
      <div className="flex items-start gap-3">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 size-5 shrink-0"
          aria-hidden="true"
        >
          <path d={TONE_ICON[toast.tone] || TONE_ICON.info} />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description ? <p className="mt-0.5 text-sm opacity-90">{toast.description}</p> : null}
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action.onClick?.();
                onDismiss(toast.id);
              }}
              className="mt-2 text-sm font-semibold underline underline-offset-2"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="rounded p-1 opacity-60 transition hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context.toast;
}

export default ToastContext;