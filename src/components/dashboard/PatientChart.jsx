'use client';

import { useParams } from 'next/navigation';
import RequireAuth from './RequireAuth';
import PatientWorkspace from './PatientWorkspace';
import { EmptyState } from '../ui/States';
import { IconStethoscope } from '../ui/Icon';

/**
 * Dynamic patient chart: the id comes from the URL, the session and role from
 * `GET /auth/me`. The backend still authorises every record request made
 * inside the workspace.
 */
export default function PatientChart() {
  const params = useParams();
  const patientId = params?.id;

  return (
    <RequireAuth roles={['DOCTOR', 'SUPER_ADMIN', 'HOSPITAL_ADMIN']}>
      {!patientId ? (
        <EmptyState
          icon={<IconStethoscope className="size-7" />}
          title="No patient selected"
          description="Pick a patient from the directory to open their chart."
        />
      ) : (
        <PatientWorkspace patientId={patientId} />
      )}
    </RequireAuth>
  );
}
