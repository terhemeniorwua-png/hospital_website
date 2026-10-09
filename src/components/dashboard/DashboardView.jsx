'use client';

import { useAuth } from '../providers/AuthProvider';
import RequireAuth from './RequireAuth';
import DashboardShell from './DashboardShell';
import PatientDashboard from './PatientDashboard';
import DoctorDashboard from './DoctorDashboard';

/**
 * `/dashboard` renders one of two role dashboards inside a shared shell.
 *
 * The role comes from `GET /auth/me`, never from anything the browser stored,
 * so a client cannot opt itself into the clinician view - the backend still
 * decides what each underlying request is allowed to return.
 */
export default function DashboardView() {
  const { role, user } = useAuth();
  const isDoctor = role === 'DOCTOR';

  return (
    <RequireAuth>
      <DashboardShell
        title={isDoctor ? 'Clinician dashboard' : 'Patient dashboard'}
        description={
          isDoctor
            ? `Dr ${user?.lastName || user?.firstName || ''}`.trim() || 'Your day at a glance'
            : 'Your care, appointments and results in one place'
        }
      >
        {isDoctor ? <DoctorDashboard /> : <PatientDashboard />}
      </DashboardShell>
    </RequireAuth>
  );
}
