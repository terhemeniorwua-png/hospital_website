'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../providers/ToastProvider';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Form';
import { IconCalendar, IconEye, IconX } from '../ui/Icon';
import { EmptyState, ErrorState, ListSkeleton } from '../ui/States';
import { cn, formatDate } from '../../lib/utils';
import { useAsync, useSubmit } from '../../hooks/useAsync';
import {
  cancelAppointment,
  getAvailability,
  rescheduleAppointment,
} from '../../lib/services/appointments';

/**
 * Patient-facing appointment actions: view, reschedule, cancel.
 *
 * Every call here is a real backend transition; the button is only rendered
 * when `GET /auth/me` reported the `appointments:update` permission, and the
 * backend still re-checks ownership before it moves anything.
 */

function ConfirmCancel({ appointment, open, onClose, onDone }) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const { submit, pending, error } = useSubmit(async () => {
    await cancelAppointment(appointment.id, reason.trim() || 'Cancelled by patient');
    toast.success('Appointment cancelled', `${appointment.appointmentNumber} has been cancelled.`);
    onDone();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancel appointment"
      description={`${appointment.appointmentNumber} · ${formatDate(appointment.appointmentDate, 'full')} at ${appointment.startTime}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Keep it
          </Button>
          <Button variant="danger" onClick={() => submit().catch(() => {})} loading={pending}>
            Cancel appointment
          </Button>
        </>
      }
    >
      <Textarea
        label="Reason (optional)"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        placeholder="Tell the clinic why you are cancelling"
        maxLength={500}
      />
      {error ? <p className="mt-3 text-sm text-danger-600">{error.message}</p> : null}
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Cancelling frees the slot for another patient. You can book a new appointment straight away.
      </p>
    </Modal>
  );
}

function RescheduleDialog({ appointment, open, onClose, onDone }) {
  const { toast } = useToast();
  const [date, setDate] = useState(appointment.appointmentDate || '');
  const [slotId, setSlotId] = useState('');

  useEffect(() => {
    if (open) {
      setDate(appointment.appointmentDate || '');
      setSlotId('');
    }
  }, [open, appointment.appointmentDate]);

  const doctorId = appointment.doctor?.id;
  const availability = useAsync(
    () => (open && doctorId && date ? getAvailability({ doctorId, date }) : Promise.resolve(null)),
    [open, doctorId, date],
    { immediate: false },
  );

  useEffect(() => {
    if (open && doctorId && date) availability.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doctorId, date]);

  const slots = useMemo(() => availability.data?.data?.slots || availability.data?.slots || [], [availability.data]);
  const usable = slots.filter((slot) => slot.isAvailable !== false && slot.status !== 'BOOKED');

  const { submit, pending, error } = useSubmit(async () => {
    const slot = usable.find((entry) => entry.id === slotId);
    if (!slot) throw new Error('Choose a new time slot first');
    await rescheduleAppointment(appointment.id, {
      doctorId,
      departmentId: appointment.department?.id,
      appointmentDate: date,
      slotId: slot.id,
      startTime: slot.startTime,
    });
    toast.success('Appointment rescheduled', `Moved to ${formatDate(date, 'full')} at ${slot.startTime}.`);
    onDone();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reschedule appointment"
      description={`Currently ${formatDate(appointment.appointmentDate, 'full')} at ${appointment.startTime}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => submit().catch(() => {})} loading={pending} disabled={!slotId}>
            Save new time
          </Button>
        </>
      }
    >
      <label className="block">
        <span className="text-sm font-medium text-ink">New date</span>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(event) => {
            setDate(event.target.value);
            setSlotId('');
          }}
          className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        />
      </label>

      <div className="mt-5">
        <p className="text-sm font-medium text-ink">Available times</p>
        {availability.loading ? (
          <ListSkeleton count={3} />
        ) : availability.error ? (
          <ErrorState
            compact
            title="Could not load availability"
            description={availability.error?.message}
            onRetry={availability.reload}
          />
        ) : usable.length === 0 ? (
          <EmptyState
            compact
            title="No free slots on that day"
            description="Try another date."
          />
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {usable.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSlotId(slot.id)}
                className={cn(
                  'rounded-lg border px-2 py-2 text-sm font-medium transition',
                  slotId === slot.id
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-line bg-white text-ink hover:border-primary-300 hover:bg-primary-50',
                )}
              >
                {slot.startTime}
              </button>
            ))}
          </div>
        )}
      </div>

      {error ? <p className="mt-4 text-sm text-danger-600">{error.message}</p> : null}
    </Modal>
  );
}

/**
 * Action cluster for a single appointment.
 * @param {object} props
 * @param {object} props.appointment
 * @param {string[]} props.permissions from `GET /auth/me`
 * @param {() => void} props.onChange called after a successful transition
 */
export default function AppointmentActions({ appointment, permissions = [], onChange, compact = false }) {
  const router = useRouter();
  const canUpdate = permissions?.includes('appointments:update');
  const [modal, setModal] = useState(null);

  const live = ['REQUESTED', 'CONFIRMED', 'CHECKED_IN'].includes(appointment.status);

  if (!canUpdate || !live) {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/appointments')}>
        <IconEye className="mr-1.5 size-4" /> View
      </Button>
    );
  }

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-2', compact && 'gap-1.5')}>
        <Button variant="outline" size="sm" onClick={() => setModal('reschedule')}>
          <IconCalendar className="mr-1.5 size-4" /> Reschedule
        </Button>
        <Button variant="ghost" size="sm" className="text-danger-600" onClick={() => setModal('cancel')}>
          <IconX className="mr-1.5 size-4" /> Cancel
        </Button>
      </div>

      <RescheduleDialog
        appointment={appointment}
        open={modal === 'reschedule'}
        onClose={() => setModal(null)}
        onDone={() => {
          setModal(null);
          onChange?.();
        }}
      />
      <ConfirmCancel
        appointment={appointment}
        open={modal === 'cancel'}
        onClose={() => setModal(null)}
        onDone={() => {
          setModal(null);
          onChange?.();
        }}
      />
    </>
  );
}
