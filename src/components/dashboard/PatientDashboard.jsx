'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '../providers/AuthProvider';
import { useRealtime } from '../providers/RealtimeProvider';
import { AsyncView, StatCard, StatGrid, Toolbar } from './primitives';
import AppointmentActions from './AppointmentActions';
import { Card, CardBody, CardHeader, DataTile, DetailRow } from '../ui/Card';
import { Avatar, Badge, StatusBadge } from '../ui/Badge';
import { Button, ButtonLink } from '../ui/Button';
import {
  IconActivity,
  IconCalendar,
  IconChat,
  IconClock,
  IconEye,
  IconFile,
  IconFlask,
  IconMailbox,
  IconPill,
  IconPlus,
  IconShield,
  IconUser,
  IconWallet,
} from '../ui/Icon';
import { EmptyState, CardSkeleton, ListSkeleton } from '../ui/States';
import { cn, formatCurrency, formatDate, timeAgo } from '../../lib/utils';
import { useAsync } from '../../hooks/useAsync';
import { APPOINTMENT_STATUS_META, listAppointments } from '../../lib/services/appointments';
import { getPatientSummary } from '../../lib/services/auth';
import {
  TIMELINE_META,
  abnormalResult,
  flattenTimeline,
  getLabResults,
  getTimeline,
} from '../../lib/services/clinical';
import { PRESCRIPTION_STATUS_META, listPrescriptions } from '../../lib/services/pharmacy';
import { getStatement, statementTotals } from '../../lib/services/billing';
import {
  conversationPreview,
  conversationTitle,
  listConversations,
  unreadCount,
  unreadNotificationCount,
} from '../../lib/services/messaging';

const QUICK_ACTIONS = [
  { href: '/appointments', label: 'Book appointment', icon: IconPlus, primary: true, permission: 'appointments:create' },
  { href: '/records', label: 'View records', icon: IconFile, permission: 'medical_records:read' },
  { href: '/prescriptions', label: 'My prescriptions', icon: IconPill, permission: 'prescriptions:read' },
  { href: '/lab-results', label: 'Lab results', icon: IconFlask, permission: 'lab_orders:read' },
  { href: '/messages', label: 'Message the clinic', icon: IconChat, permission: 'messages:send' },
  { href: '/billing', label: 'Statements & payments', icon: IconWallet, permission: 'billing:read' },
];

/** Aggregates the handful of numbers the stat row needs into one request batch. */
function useDashboardCounts(patientId, revision) {
  return useAsync(
    async () => {
      const [upcoming, completed, unread, conversations] = await Promise.all([
        listAppointments({ mine: true, upcoming: true, limit: 1 }).catch(() => null),
        listAppointments({ mine: true, status: 'COMPLETED', limit: 1 }).catch(() => null),
        unreadNotificationCount().catch(() => null),
        listConversations({ limit: 1 }).catch(() => null),
      ]);
      return {
        upcoming: upcoming?.pagination?.total ?? 0,
        completed: completed?.pagination?.total ?? 0,
        unreadNotifications: unreadCount(unread?.data ?? unread),
        threads: conversations?.pagination?.total ?? 0,
      };
    },
    [patientId, revision],
  );
}

function UpcomingAppointment({ permissions, onChanged, revision }) {
  const { data, loading, error, reload } = useAsync(
    () => listAppointments({ mine: true, upcoming: true, limit: 1, sort: 'appointmentDate', order: 'asc' }),
    [revision],
  );

  const appointment = data?.data?.[0] || null;

  if (loading) return <Card><CardSkeleton lines={4} /></Card>;
  if (error) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            compact
            icon={<IconCalendar className="size-6" />}
            title="Could not load your next appointment"
            description={error?.message}
            action={<Button size="sm" variant="secondary" onClick={reload}>Try again</Button>}
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<IconCalendar className="size-5" />}
        title="Next appointment"
        description={appointment ? undefined : 'Nothing booked yet'}
        action={
          appointment ? <StatusBadge status={appointment.status} meta={APPOINTMENT_STATUS_META} size="sm" /> : null
        }
      />
      <CardBody>
        {!appointment ? (
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink">You have no upcoming appointments.</p>
              <p className="mt-1 text-sm text-muted">
                Booking takes a couple of minutes and you can pick the clinic, doctor and time.
              </p>
            </div>
            <ButtonLink href="/appointments">
              <IconPlus className="mr-1.5 size-4" /> Book appointment
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar
                firstName={appointment.doctor?.user?.firstName}
                lastName={appointment.doctor?.user?.lastName}
                size="lg"
              />
              <div className="min-w-0">
                <p className="text-lg font-semibold text-ink">
                  {appointment.doctorName ? `Dr ${appointment.doctorName}` : 'Clinician'}
                </p>
                <p className="text-sm text-muted">
                  {appointment.doctor?.specialization || appointment.department?.name || 'Consultation'}
                </p>
              </div>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <DataTile label="Date" value={formatDate(appointment.appointmentDate, 'day')} tone="primary" />
              <DataTile label="Time" value={`${appointment.startTime} – ${appointment.endTime}`} tone="teal" />
              <DataTile
                label="Reference"
                value={<span className="text-lg">{appointment.appointmentNumber}</span>}
                tone="default"
              />
            </dl>

            {appointment.reason ? (
              <p className="mt-3 text-sm text-muted">
                <span className="font-medium text-ink">Reason:</span> {appointment.reason}
              </p>
            ) : null}

            <div className="mt-4">
              <AppointmentActions appointment={appointment} permissions={permissions} onChange={() => { reload(); onChanged?.(); }} />
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function MedicalInformation({ patientId }) {
  const { data, loading, error, reload } = useAsync(() => getPatientSummary(patientId), [patientId]);
  const summary = data?.data;

  if (loading) return <Card><CardSkeleton lines={5} /></Card>;
  if (error) {
    return (
      <Card>
        <CardHeader icon={<IconShield className="size-5" />} title="Medical information" />
        <CardBody>
          <p className="text-sm text-danger-600">{error?.message}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={reload}>Try again</Button>
        </CardBody>
      </Card>
    );
  }

  const allergies = summary?.allergies || [];
  const conditions = summary?.conditions || summary?.activeDiagnoses || [];
  const vitals = summary?.latestVitals;

  return (
    <Card>
      <CardHeader
        icon={<IconShield className="size-5" />}
        title="Medical information"
        description="Shared with your care team"
        action={<Badge tone="muted" size="sm">Read only</Badge>}
      />
      <CardBody className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Allergies</p>
          {allergies.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {allergies.map((allergy) => (
                <li key={allergy.id || allergy.name}>
                  <Badge tone="danger" size="sm">{allergy.name || allergy.allergen || allergy}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-sm text-muted">No allergies recorded.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Active conditions</p>
          {conditions.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {conditions.map((condition) => (
                <li key={condition.id || condition.name}>
                  <Badge tone="warning" size="sm">{condition.name || condition.conditionName || condition}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-sm text-muted">No active conditions recorded.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Latest vitals</p>
          {vitals ? (
            <dl className="mt-2 divide-y divide-line">
              <DetailRow label="Blood pressure" value={vitals.bloodPressure || vitals.bp || '—'} />
              <DetailRow label="Pulse" value={vitals.pulse ? `${vitals.pulse} bpm` : '—'} />
              <DetailRow label="Temperature" value={vitals.temperature ? `${vitals.temperature} °C` : '—'} />
              <DetailRow label="Weight" value={vitals.weight ? `${vitals.weight} kg` : '—'} />
            </dl>
          ) : (
            <p className="mt-1.5 text-sm text-muted">No vitals recorded yet.</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function RecentActivity({ patientId, revision }) {
  const { data, loading, error, reload } = useAsync(() => getTimeline(patientId), [patientId, revision]);
  const events = useMemo(() => flattenTimeline(data?.data?.events || data?.data), [data]);

  return (
    <Card>
      <CardHeader
        icon={<IconActivity className="size-5" />}
        title="Recent activity"
        description="Appointments, results and prescriptions"
        action={
          <ButtonLink href="/records" variant="ghost" size="sm">
            <IconEye className="mr-1.5 size-4" /> Full record
          </ButtonLink>
        }
      />
      <CardBody>
        {loading ? (
          <ListSkeleton count={4} />
        ) : error ? (
          <p className="text-sm text-danger-600">
            {error?.message} <button type="button" onClick={reload} className="font-semibold underline">Retry</button>
          </p>
        ) : events.length === 0 ? (
          <EmptyState
            compact
            icon={<IconActivity className="size-6" />}
            title="No activity yet"
            description="Your appointments and results will be listed here as they happen."
          />
        ) : (
          <ol className="relative space-y-4 border-l border-line pl-5">
            {events.slice(0, 8).map((event, index) => {
              const meta = TIMELINE_META[event.timelineType] || { label: event.timelineType, tone: 'muted' };
              const when = event.appointmentDate || event.createdAt || event.date;
              return (
                <li key={`${event.timelineType}-${event.id || index}`} className="relative">
                  <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-primary-500 ring-4 ring-white" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={meta.tone} size="sm">{meta.label}</Badge>
                    <span className="text-sm font-medium text-ink">
                      {event.appointmentNumber || event.prescriptionNumber || event.orderNumber || event.consultationNumber || event.title || 'Update'}
                    </span>
                    <span className="text-xs text-muted">{when ? formatDate(when, 'short') : timeAgo(event.createdAt)}</span>
                  </div>
                  {event.reason || event.status ? (
                    <p className="mt-0.5 text-sm text-muted">{event.reason || event.status}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

function RecentPrescriptions({ patientId, revision }) {
  return (
    <AsyncView
      fetcher={() => listPrescriptions({ patientId, limit: 5 })}
      deps={[patientId, revision]}
      skeleton={<Card><CardSkeleton lines={4} /></Card>}
      empty={
        <Card>
          <CardHeader icon={<IconPill className="size-5" />} title="Prescriptions" />
          <CardBody>
            <EmptyState compact icon={<IconPill className="size-6" />} title="No prescriptions" description="Medication prescribed during a visit will appear here." />
          </CardBody>
        </Card>
      }
    >
      {(response) => (
        <Card>
          <CardHeader
            icon={<IconPill className="size-5" />}
            title="Prescriptions"
            action={<ButtonLink href="/prescriptions" variant="ghost" size="sm">See all</ButtonLink>}
          />
          <CardBody className="space-y-3">
            {response.data.map((rx) => (
              <div key={rx.id} className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{rx.prescriptionNumber}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {rx.prescribedByName ? `Prescribed by ${rx.prescribedByName}` : 'Prescription'}
                    {' · '}
                    {formatDate(rx.createdAt, 'short')}
                  </p>
                </div>
                <StatusBadge status={rx.status} meta={PRESCRIPTION_STATUS_META} size="sm" />
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </AsyncView>
  );
}

function RecentResults({ patientId, revision }) {
  return (
    <AsyncView
      fetcher={() => getLabResults({ patientId, limit: 5 })}
      deps={[patientId, revision]}
      skeleton={<Card><CardSkeleton lines={4} /></Card>}
      empty={
        <Card>
          <CardHeader icon={<IconFlask className="size-5" />} title="Lab results" />
          <CardBody>
            <EmptyState compact icon={<IconFlask className="size-6" />} title="No results yet" description="Published test results will show up here." />
          </CardBody>
        </Card>
      }
    >
      {(response) => (
        <Card>
          <CardHeader
            icon={<IconFlask className="size-5" />}
            title="Lab results"
            action={<ButtonLink href="/lab-results" variant="ghost" size="sm">See all</ButtonLink>}
          />
          <CardBody className="space-y-3">
            {response.data.map((row) => {
              const flagged = abnormalResult(row);
              return (
                <div key={row.id} className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {row.test?.name || row.testName || row.orderNumber || 'Laboratory test'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {row.value != null && row.value !== '' ? `${row.value} ${row.unit || ''}`.trim() : 'Result pending'}
                      {row.performedAt ? ` · ${formatDate(row.performedAt, 'short')}` : ''}
                    </p>
                  </div>
                  <Badge tone={flagged ? 'danger' : 'success'} size="sm">
                    {flagged ? 'Out of range' : 'Normal'}
                  </Badge>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}
    </AsyncView>
  );
}

function MessagesPreview({ revision }) {
  return (
    <AsyncView
      fetcher={() => listConversations({ limit: 4 })}
      deps={[revision]}
      skeleton={<Card><CardSkeleton lines={3} /></Card>}
      empty={
        <Card>
          <CardHeader icon={<IconChat className="size-5" />} title="Messages" />
          <CardBody>
            <EmptyState compact icon={<IconMailbox className="size-6" />} title="No messages yet" description="Start a conversation with your care team." />
            <ButtonLink href="/messages" variant="secondary" size="sm" className="mt-3 w-full justify-center">Open messages</ButtonLink>
          </CardBody>
        </Card>
      }
    >
      {(response) => (
        <Card>
          <CardHeader
            icon={<IconChat className="size-5" />}
            title="Messages"
            action={<ButtonLink href="/messages" variant="ghost" size="sm">Open inbox</ButtonLink>}
          />
          <CardBody className="space-y-3">
            {response.data.map((thread) => (
              <Link
                key={thread.id}
                href="/messages"
                className="flex items-start gap-3 rounded-lg border border-line p-3 transition hover:border-primary-300 hover:bg-primary-50"
              >
                <Avatar firstName={thread.participants?.[0]?.user?.firstName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{conversationTitle(thread)}</span>
                    <span className="shrink-0 text-[11px] text-muted">{timeAgo(thread.lastMessageAt || thread.updatedAt)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{conversationPreview(thread) || 'No messages yet'}</span>
                </span>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}
    </AsyncView>
  );
}

export default function PatientDashboard() {
  const { user, patientId, permissions = [] } = useAuth();
  const { revision } = useRealtime();
  const counts = useDashboardCounts(patientId, revision);

  const can = (permission) => permissions?.includes(permission) ?? false;
  const actions = QUICK_ACTIONS.filter((action) => can(action.permission));

  const statement = useAsync(
    () => (patientId ? getStatement(patientId) : Promise.resolve(null)),
    [patientId, revision],
  );
  const totals = statementTotals(statement.data?.data);

  const firstName = user?.firstName || 'there';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sa-eyebrow">Welcome back</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Hello, {firstName}</h1>
          <p className="mt-1 text-sm text-muted">
            {user?.patient?.hospitalNumber ? `Hospital number ${user.patient.hospitalNumber}` : 'Here is the latest on your care.'}
          </p>
        </div>
        <Toolbar>
          <ButtonLink href="/appointments" size="sm">
            <IconPlus className="mr-1.5 size-4" /> Book appointment
          </ButtonLink>
        </Toolbar>
      </div>

      <StatGrid>
        <StatCard
          label="Upcoming appointments"
          value={counts.loading ? '—' : counts.data?.upcoming ?? 0}
          hint={counts.error ? 'Unavailable' : 'Booked and still live'}
          icon={IconCalendar}
          tone="primary"
        />
        <StatCard
          label="Unread notifications"
          value={counts.loading ? '—' : counts.data?.unreadNotifications ?? 0}
          hint="Results, messages and reminders"
          icon={IconClock}
          tone="warning"
        />
        <StatCard
          label="Outstanding balance"
          value={statement.loading ? '—' : formatCurrency(totals.outstanding, totals.currency)}
          hint={totals.paid ? `${formatCurrency(totals.paid, totals.currency)} settled` : 'Nothing paid yet'}
          icon={IconWallet}
          tone={totals.outstanding > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Message threads"
          value={counts.loading ? '—' : counts.data?.threads ?? 0}
          hint="With your care team"
          icon={IconChat}
          tone="teal"
        />
      </StatGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <UpcomingAppointment permissions={permissions} onChanged={counts.reload} revision={revision} />
          <RecentActivity patientId={patientId} revision={revision} />
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader icon={<IconUser className="size-5" />} title="Quick actions" />
            <CardBody className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm font-medium transition',
                    action.primary
                      ? 'border-primary-600 bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-white text-ink hover:border-primary-300 hover:bg-primary-50',
                  )}
                >
                  <action.icon className={cn('size-5', action.primary ? 'text-white' : 'text-primary-600')} />
                  {action.label}
                </Link>
              ))}
            </CardBody>
          </Card>

          <MedicalInformation patientId={patientId} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentPrescriptions patientId={patientId} revision={revision} />
        <RecentResults patientId={patientId} revision={revision} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MessagesPreview revision={revision} />
        <Card>
          <CardHeader
            icon={<IconWallet className="size-5" />}
            title="Billing summary"
            action={<ButtonLink href="/billing" variant="ghost" size="sm">Details</ButtonLink>}
          />
          <CardBody className="space-y-3">
            {statement.loading ? (
              <ListSkeleton count={3} />
            ) : statement.error ? (
              <p className="text-sm text-danger-600">{statement.error?.message}</p>
            ) : (
              <>
                <DetailRow label="Billed" value={formatCurrency(totals.billed, totals.currency)} />
                <DetailRow label="Paid" value={formatCurrency(totals.paid, totals.currency)} />
                <DetailRow
                  label="Outstanding"
                  value={
                    <span className={totals.outstanding > 0 ? 'text-danger-600' : 'text-success-600'}>
                      {formatCurrency(totals.outstanding, totals.currency)}
                    </span>
                  }
                />
                {totals.overdueInvoices > 0 ? (
                  <DetailRow label="Overdue invoices" value={String(totals.overdueInvoices)} />
                ) : null}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
