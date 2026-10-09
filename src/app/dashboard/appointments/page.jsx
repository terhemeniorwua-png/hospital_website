'use client';

import { useState } from 'react';
import RequireAuth from '../../../components/dashboard/RequireAuth';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import AppointmentActions from '../../../components/dashboard/AppointmentActions';
import DoctorAppointmentActions from '../../../components/dashboard/DoctorAppointmentActions';
import { AsyncView, Toolbar } from '../../../components/dashboard/primitives';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Badge, StatusBadge } from '../../../components/ui/Badge';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Form';
import { IconCalendar, IconPlus } from '../../../components/ui/Icon';
import { EmptyState, ListSkeleton } from '../../../components/ui/States';
import { Pagination } from '../../../components/ui/Pagination';
import { formatDate, toDateInputValue } from '../../../lib/utils';
import { useAuth } from '../../../components/providers/AuthProvider';
import { useRealtime } from '../../../components/providers/RealtimeProvider';
import { APPOINTMENT_STATUS_META, APPOINTMENT_TYPES, listAppointments } from '../../../lib/services/appointments';

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CHECKED_IN', label: 'Checked in' },
  { value: 'IN_QUEUE', label: 'In queue' },
  { value: 'IN_CONSULTATION', label: 'In consultation' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No-show' },
];

const RANGE_OPTIONS = [
  { value: '', label: 'All dates' },
  { value: 'upcoming', label: 'Upcoming only' },
  { value: 'past', label: 'Past' },
];

export default function AppointmentsPage() {
  const { role, permissions } = useAuth();
  const { revision } = useRealtime();
  const isDoctor = role === 'DOCTOR';

  const [status, setStatus] = useState('');
  const [range, setRange] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const changed = () => setTick((value) => value + 1);

  const today = toDateInputValue();

  const query = {
    page,
    limit: 10,
    ...(status ? { status } : {}),
    ...(range === 'upcoming' ? { upcoming: true } : {}),
    ...(range === 'past' ? { to: today } : {}),
  };

  return (
    <RequireAuth>
      <DashboardShell
        title="Appointments"
        description={isDoctor ? 'Your diary and patient bookings' : 'Your bookings, past and future'}
        wide
      >
        <Toolbar className="mb-5">
          <Select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          <Select aria-label="Filter by date range" value={range} onChange={(event) => { setRange(event.target.value); setPage(1); }}>
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          <Button variant="ghost" size="sm" onClick={() => { setStatus(''); setRange('upcoming'); setPage(1); }}>
            Reset
          </Button>
        </Toolbar>

        <AsyncView
          fetcher={() => listAppointments(query)}
          deps={[status, range, page, tick, revision]}
          skeleton={<ListSkeleton count={5} />}
          empty={
            <EmptyState
              icon={<IconCalendar className="size-7" />}
              title="No appointments match those filters"
              description={isDoctor ? 'Bookings made against your diary will appear here.' : 'Book a consultation and it will show up here.'}
              action={
                isDoctor ? null : (
                  <ButtonLink href="/appointments">
                    <IconPlus className="mr-1.5 size-4" /> Book appointment
                  </ButtonLink>
                )
              }
            />
          }
        >
          {(response, reload) => (
            <div className="space-y-4">
              <Card>
                <CardHeader
                  icon={<IconCalendar className="size-5" />}
                  title={isDoctor ? 'Appointments' : 'Your appointments'}
                  description={`${response.pagination?.total ?? response.data.length} total`}
                />
                <CardBody className="space-y-3">
                  {response.data.map((appointment) => (
                    <div key={appointment.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-ink">
                            {isDoctor ? appointment.patientName || 'Patient' : `Dr ${appointment.doctorName || ''}`.trim()}
                          </p>
                          <StatusBadge status={appointment.status} meta={APPOINTMENT_STATUS_META} size="sm" />
                          <Badge tone="muted" size="sm">{appointment.appointmentNumber}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          {formatDate(appointment.appointmentDate, 'full')} · {appointment.startTime}–{appointment.endTime}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {appointment.department?.name || appointment.doctor?.specialization || 'Consultation'}
                          {appointment.reason ? ` · ${appointment.reason}` : ''}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {isDoctor ? (
                          <DoctorAppointmentActions appointment={appointment} permissions={permissions} onChanged={() => { changed(); reload(); }} />
                        ) : (
                          <AppointmentActions appointment={appointment} permissions={permissions} onChange={() => { changed(); reload(); }} />
                        )}
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>

              <Pagination pagination={response.pagination} onPageChange={setPage} />
            </div>
          )}
        </AsyncView>
      </DashboardShell>
    </RequireAuth>
  );
}
