'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../providers/AuthProvider';
import { useRealtime } from '../providers/RealtimeProvider';
import { useToast } from '../providers/ToastProvider';
import { AsyncView, StatCard, StatGrid } from './primitives';
import DoctorAppointmentActions from './DoctorAppointmentActions';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Badge, StatusBadge } from '../ui/Badge';
import { Button, ButtonLink } from '../ui/Button';
import {
  IconActivity,
  IconCalendar,
  IconChat,
  IconClock,
  IconEye,
  IconFlask,
  IconMailbox,
  IconSearch,
  IconStethoscope,
  IconUsers,
} from '../ui/Icon';
import { CardSkeleton, EmptyState, ListSkeleton } from '../ui/States';
import { cn, formatDate, formatTime, timeAgo, toDateInputValue } from '../../lib/utils';
import { useAsync, useSubmit } from '../../hooks/useAsync';
import { APPOINTMENT_STATUS_META, listAppointments } from '../../lib/services/appointments';
import { QUEUE_STATUS_META, callNext, completeQueueEntry, getQueueBoard, skipQueueEntry, startQueueService } from '../../lib/services/queue';
import { getConsultations } from '../../lib/services/clinical';
import { listPatients } from '../../lib/services/patients';
import { listConversations, conversationPreview, conversationTitle, unreadCount, unreadNotificationCount } from '../../lib/services/messaging';

const TODAY = () => toDateInputValue();

function useDoctorCounts(departmentId, revision) {
  return useAsync(
    async () => {
      const [appointments, board, unread, threads] = await Promise.all([
        listAppointments({ mine: true, date: TODAY(), limit: 1 }).catch(() => null),
        departmentId ? getQueueBoard({ departmentId, date: TODAY() }).catch(() => null) : Promise.resolve(null),
        unreadNotificationCount().catch(() => null),
        listConversations({ limit: 1 }).catch(() => null),
      ]);
      return {
        appointments: appointments?.pagination?.total ?? 0,
        waiting: board?.data?.summary?.waiting ?? 0,
        unreadNotifications: unreadCount(unread?.data ?? unread),
        threads: threads?.pagination?.total ?? 0,
      };
    },
    [departmentId, revision],
  );
}

function TodayAppointments({ departmentId, permissions, onChanged, revision }) {
  return (
    <AsyncView
      fetcher={() => listAppointments({ mine: true, date: TODAY(), limit: 25, sort: 'startTime', order: 'asc' })}
      deps={[revision]}
      skeleton={<Card><CardSkeleton lines={5} /></Card>}
      empty={
        <Card>
          <CardHeader icon={<IconCalendar className="size-5" />} title="Today's appointments" description={formatDate(new Date(), 'full')} />
          <CardBody>
            <EmptyState
              compact
              icon={<IconCalendar className="size-6" />}
              title="Nothing booked for today"
              description="Appointments booked against your diary will appear here."
            />
          </CardBody>
        </Card>
      }
    >
      {(response) => (
        <Card>
          <CardHeader
            icon={<IconCalendar className="size-5" />}
            title="Today's appointments"
            description={`${formatDate(new Date(), 'full')} · ${response.pagination?.total ?? response.data.length} booked`}
            action={<ButtonLink href="/dashboard/appointments" variant="ghost" size="sm">All appointments</ButtonLink>}
          />
          <CardBody className="space-y-3">
            {response.data.map((appointment) => (
              <div
                key={appointment.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
                    {formatTime(appointment.startTime).replace(/\s/g, '')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {appointment.patientName || 'Patient'}
                      {appointment.patient?.hospitalNumber ? (
                        <span className="ml-2 text-xs font-normal text-muted">{appointment.patient.hospitalNumber}</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {appointment.appointmentNumber} · {appointment.type || 'Consultation'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={appointment.status} meta={APPOINTMENT_STATUS_META} size="sm" />
                  <DoctorAppointmentActions
                    appointment={appointment}
                    permissions={permissions}
                    onChanged={() => onChanged?.()}
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </AsyncView>
  );
}

export function QueuePanel({ departmentId, canManage, onChanged, revision }) {
  const { toast } = useToast();

  const action = useSubmit(async (kind, entry) => {
    if (kind === 'call') await callNext({ departmentId, date: TODAY() });
    if (kind === 'start') await startQueueService(entry.id);
    if (kind === 'complete') await completeQueueEntry(entry.id);
    if (kind === 'skip') await skipQueueEntry(entry.id, 'Skipped by clinician');
    toast.success('Queue updated');
    onChanged?.();
  });

  return (
    <AsyncView
      fetcher={() => (departmentId ? getQueueBoard({ departmentId, date: TODAY() }) : Promise.resolve({ data: { entries: [] } }))}
      deps={[revision]}
      skeleton={<Card><CardSkeleton lines={5} /></Card>}
      empty={
        <Card>
          <CardHeader icon={<IconClock className="size-5" />} title="Patient queue" description="No one waiting" />
          <CardBody>
            <EmptyState compact icon={<IconClock className="size-6" />} title="Queue is empty" description="Patients join the queue when they check in." />
          </CardBody>
        </Card>
      }
      isEmpty={(payload) => !(payload?.data?.entries || []).length}
    >
      {(response) => {
        const entries = response.data?.entries || [];
        const summary = response.data?.summary || {};
        return (
          <Card>
            <CardHeader
              icon={<IconClock className="size-5" />}
              title="Patient queue"
              description={response.data?.department?.name || 'Your department'}
              action={
                canManage ? (
                  <Button
                    size="sm"
                    loading={action.pending}
                    onClick={() => action.submit('call').catch(() => {})}
                    disabled={!summary.waiting}
                  >
                    Call next
                  </Button>
                ) : null
              }
            />
            <CardBody className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone="warning" size="sm">{summary.waiting ?? 0} waiting</Badge>
                <Badge tone="primary" size="sm">{summary.called ?? 0} called</Badge>
                <Badge tone="success" size="sm">{summary.completed ?? 0} done</Badge>
              </div>

              <ul className="space-y-2">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-canvas text-sm font-bold tabular-nums text-ink">
                        {entry.ticketNumber}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{entry.patientName || 'Patient'}</p>
                        <p className="truncate text-xs text-muted">
                          {entry.priority || 'Routine'} · {entry.position != null ? `#${entry.position}` : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={entry.status} meta={QUEUE_STATUS_META} size="sm" />
                      {canManage ? (
                        <div className="flex gap-1.5">
                          {entry.status === 'WAITING' ? (
                            <Button size="sm" variant="secondary" loading={action.pending} onClick={() => action.submit('start', entry).catch(() => {})}>
                              Call in
                            </Button>
                          ) : null}
                          {entry.status === 'IN_SERVICE' ? (
                            <Button size="sm" loading={action.pending} onClick={() => action.submit('complete', entry).catch(() => {})}>
                              Finish
                            </Button>
                          ) : null}
                          {['WAITING', 'CALLED'].includes(entry.status) ? (
                            <Button size="sm" variant="ghost" onClick={() => action.submit('skip', entry).catch(() => {})}>
                              Skip
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        );
      }}
    </AsyncView>
  );
}

function RecentPatients(revision) {
  return (
    <AsyncView
      fetcher={() => listPatients({ limit: 5, sort: 'createdAt', order: 'desc' })}
      deps={[revision]}
      skeleton={<Card><CardSkeleton lines={4} /></Card>}
      empty={
        <Card>
          <CardHeader icon={<IconUsers className="size-5" />} title="My patients" />
          <CardBody>
            <EmptyState compact icon={<IconUsers className="size-6" />} title="No patients yet" description="Patients appear here once they are registered." />
          </CardBody>
        </Card>
      }
    >
      {(response) => (
        <Card>
          <CardHeader
            icon={<IconUsers className="size-5" />}
            title="My patients"
            action={<ButtonLink href="/dashboard/patients" variant="ghost" size="sm">Search</ButtonLink>}
          />
          <CardBody className="space-y-2">
            {response.data.map((patient) => (
              <Link
                key={patient.id}
                href={`/dashboard/patients/${patient.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 transition hover:border-primary-300 hover:bg-primary-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {patient.fullName || `${patient.firstName} ${patient.lastName}`.trim()}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {patient.hospitalNumber}
                    {patient.age != null ? ` · ${patient.age} yrs` : ''}
                    {patient.gender ? ` · ${patient.gender}` : ''}
                  </span>
                </span>
                <IconEye className="size-4 shrink-0 text-muted" />
              </Link>
            ))}
          </CardBody>
        </Card>
      )}
    </AsyncView>
  );
}

function OpenConsultations({ revision }) {
  return (
    <AsyncView
      fetcher={() => getConsultations({ limit: 5 })}
      deps={[revision]}
      skeleton={<Card><CardSkeleton lines={3} /></Card>}
      empty={
        <Card>
          <CardHeader icon={<IconStethoscope className="size-5" />} title="Open consultations" />
          <CardBody>
            <EmptyState compact icon={<IconStethoscope className="size-6" />} title="No open encounters" description="Consultations you start from an appointment appear here." />
          </CardBody>
        </Card>
      }
    >
      {(response) => (
        <Card>
          <CardHeader
            icon={<IconStethoscope className="size-5" />}
            title="Recent consultations"
            action={<Badge tone="muted" size="sm">{response.pagination?.total ?? response.data.length}</Badge>}
          />
          <CardBody className="space-y-3">
            {response.data.map((consultation) => (
              <div key={consultation.id} className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{consultation.consultationNumber}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {consultation.patientName || 'Patient'}
                    {consultation.diagnosisSummary ? ` · ${consultation.diagnosisSummary}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted">{timeAgo(consultation.createdAt)}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </AsyncView>
  );
}

function MessagesPreview() {
  return (
    <AsyncView
      fetcher={() => listConversations({ limit: 4 })}
      skeleton={<Card><CardSkeleton lines={3} /></Card>}
      empty={
        <Card>
          <CardHeader icon={<IconChat className="size-5" />} title="Messages" />
          <CardBody>
            <EmptyState compact icon={<IconMailbox className="size-6" />} title="No messages" description="Nursing and front-desk threads show up here." />
            <ButtonLink href="/messages" variant="secondary" size="sm" className="mt-3 w-full justify-center">Open inbox</ButtonLink>
          </CardBody>
        </Card>
      }
    >
      {(response) => (
        <Card>
          <CardHeader icon={<IconChat className="size-5" />} title="Messages" action={<ButtonLink href="/messages" variant="ghost" size="sm">Inbox</ButtonLink>} />
          <CardBody className="space-y-2">
            {response.data.map((thread) => (
              <Link key={thread.id} href="/messages" className="block rounded-lg border border-line p-3 transition hover:border-primary-300 hover:bg-primary-50">
                <span className="block truncate text-sm font-semibold text-ink">{conversationTitle(thread)}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{conversationPreview(thread) || 'No messages yet'}</span>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}
    </AsyncView>
  );
}

export default function DoctorDashboard() {
  const { user, role, permissions = [] } = useAuth();
  const { revision } = useRealtime();
  const router = useRouter();

  const departmentId = user?.doctorProfile?.departmentId || null;
  const counts = useDoctorCounts(departmentId, revision);
  const canManage = permissions?.includes('queue:manage');

  const refreshAll = () => counts.reload();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sa-eyebrow">Clinician dashboard</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">
            {user?.firstName ? `Dr ${user.firstName}` : 'Doctor'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {user?.doctorProfile?.specialization || 'Consultant'}
            {user?.doctorProfile?.isOnDuty ? ' · On duty' : ' · Off duty'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/dashboard/patients" variant="secondary" size="sm">
            <IconSearch className="mr-1.5 size-4" /> Find a patient
          </ButtonLink>
          <ButtonLink href="/dashboard/queue" size="sm">
            <IconClock className="mr-1.5 size-4" /> Open queue
          </ButtonLink>
        </div>
      </div>

      <StatGrid>
        <StatCard
          label="Today's appointments"
          value={counts.loading ? '—' : counts.data?.appointments ?? 0}
          hint={formatDate(new Date(), 'full')}
          icon={IconCalendar}
          tone="primary"
        />
        <StatCard
          label="Waiting in queue"
          value={counts.loading ? '—' : counts.data?.waiting ?? 0}
          hint={canManage ? 'You can call the next patient' : 'Queue is read-only for you'}
          icon={IconClock}
          tone="warning"
        />
        <StatCard
          label="Unread notifications"
          value={counts.loading ? '—' : counts.data?.unreadNotifications ?? 0}
          hint="Results, messages and referrals"
          icon={IconActivity}
          tone="teal"
        />
        <StatCard
          label="Message threads"
          value={counts.loading ? '—' : counts.data?.threads ?? 0}
          hint="With the care team"
          icon={IconChat}
          tone="success"
        />
      </StatGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <TodayAppointments departmentId={departmentId} permissions={permissions} onChanged={refreshAll} revision={revision} />
          <QueuePanel departmentId={departmentId} canManage={canManage} onChanged={refreshAll} revision={revision} />
        </div>

        <div className="min-w-0 space-y-6">
          <RecentPatients revision={revision} />
          <OpenConsultations revision={revision} />
          <MessagesPreview />
        </div>
      </div>
    </div>
  );
}
