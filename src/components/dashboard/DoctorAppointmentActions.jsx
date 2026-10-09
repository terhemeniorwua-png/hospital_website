'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '../providers/ToastProvider';
import { Button } from '../ui/Button';
import { useSubmit } from '../../hooks/useAsync';
import { checkInAppointment } from '../../lib/services/appointments';

/**
 * Clinician actions for one appointment.
 *
 * Check-in needs `appointments:update`; opening the encounter needs
 * `consultations:write`. Both come from the permission list `GET /auth/me`
 * returns, and the backend re-checks each one on the way in.
 */
export default function DoctorAppointmentActions({ appointment, permissions = [], onChanged, patientId }) {
  const router = useRouter();
  const { toast } = useToast();
  const canUpdate = permissions?.includes('appointments:update');
  const canConsult = permissions?.includes('consultations:write');

  const status = appointment.status;

  const checkIn = useSubmit(async () => {
    await checkInAppointment(appointment.id, 'Checked in at the desk');
    toast.success('Patient checked in', `${appointment.patientName || 'Patient'} is marked as arrived.`);
    onChanged?.();
  });

  const openWorkspace = () => {
    const id = patientId || appointment.patient?.id;
    if (id) router.push(`/dashboard/patients/${id}`);
  };

  const showCheckIn = canUpdate && ['REQUESTED', 'CONFIRMED'].includes(status);
  const showStart = canConsult && ['CHECKED_IN', 'IN_QUEUE'].includes(status);
  const showOpen = canConsult && status === 'IN_CONSULTATION';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showCheckIn ? (
        <Button size="sm" variant="secondary" loading={checkIn.pending} onClick={() => checkIn.submit().catch(() => {})}>
          Check in
        </Button>
      ) : null}

      {showStart ? (
        <Button size="sm" onClick={openWorkspace}>
          Start consultation
        </Button>
      ) : null}

      {showOpen ? (
        <Button size="sm" onClick={openWorkspace}>
          Open consultation
        </Button>
      ) : null}

      {!showCheckIn && !showStart && !showOpen ? (
        <Button size="sm" variant="outline" onClick={openWorkspace}>
          Open patient
        </Button>
      ) : null}
    </div>
  );
}
