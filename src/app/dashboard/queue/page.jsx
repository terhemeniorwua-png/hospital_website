'use client';

import RequireAuth from '../../../components/dashboard/RequireAuth';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import { QueuePanel } from '../../../components/dashboard/DoctorDashboard';
import { AsyncView, StatGrid, StatCard } from '../../../components/dashboard/primitives';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { IconClock, IconRefresh, IconUsers } from '../../../components/ui/Icon';
import { ListSkeleton } from '../../../components/ui/States';
import { useAuth } from '../../../components/providers/AuthProvider';
import { useRealtime } from '../../../components/providers/RealtimeProvider';
import { getQueueStatistics, listQueue, QUEUE_STATUS_META, waitingMinutes } from '../../../lib/services/queue';
import { StatusBadge } from '../../../components/ui/Badge';
import { toDateInputValue } from '../../../lib/utils';

function QueueStatistics({ departmentId }) {
  const today = toDateInputValue();
  return (
    <AsyncView
      fetcher={() => getQueueStatistics({ departmentId, date: today })}
      skeleton={<ListSkeleton count={2} />}
      isEmpty={() => false}
    >
      {(response) => {
        const stats = response.data || {};
        const byStatus = stats.byStatus || {};
        return (
          <StatGrid className="mb-6">
            <StatCard label="Waiting" value={byStatus.WAITING ?? 0} icon={IconClock} tone="warning" hint={`As of ${today}`} />
            <StatCard label="Called" value={byStatus.CALLED ?? 0} icon={IconUsers} tone="primary" hint="At the desk" />
            <StatCard label="Completed" value={byStatus.COMPLETED ?? 0} icon={IconRefresh} tone="success" hint="Seen today" />
            <StatCard
              label="Average wait"
              value={`${Math.round(stats.averageWaitMinutes ?? 0)}m`}
              icon={IconClock}
              tone="teal"
              hint="Today"
            />
          </StatGrid>
        );
      }}
    </AsyncView>
  );
}

function TodayEntries({ departmentId }) {
  const today = toDateInputValue();
  return (
    <AsyncView
      fetcher={() => listQueue({ date: today, departmentId, limit: 50 })}
      skeleton={<ListSkeleton count={4} />}
      empty={null}
      isEmpty={(payload) => !(payload?.data || []).length}
    >
      {(response) => (
        <Card>
          <CardHeader icon={<IconRefresh className="size-5" />} title="Queue log" description="Every entry recorded today" />
          <CardBody className="space-y-2">
            {response.data.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    <span className="mr-2 font-bold tabular-nums text-primary-700">{entry.ticketNumber}</span>
                    {entry.patientName || 'Patient'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Joined {entry.joinedAt ? new Date(entry.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    {waitingMinutes(entry) != null ? ` · in queue ${waitingMinutes(entry)}m` : ''}
                  </p>
                </div>
                <StatusBadge status={entry.status} meta={QUEUE_STATUS_META} size="sm" />
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </AsyncView>
  );
}

export default function QueuePage() {
  const { user, permissions } = useAuth();
  const { revision } = useRealtime();
  const departmentId = user?.doctorProfile?.departmentId || null;
  const canManage = permissions?.includes('queue:manage');

  return (
    <RequireAuth roles={['DOCTOR', 'SUPER_ADMIN', 'HOSPITAL_ADMIN']}>
      <DashboardShell title="Patient queue" description="Live board for your department" wide>
        {!departmentId ? (
          <Card>
            <CardHeader icon={<IconClock className="size-5" />} title="No department assigned" />
            <CardBody>
              <p className="text-sm text-muted">
                Your clinician profile is not attached to a department, so there is no queue to manage. Ask an
                administrator to assign you one.
              </p>
            </CardBody>
          </Card>
        ) : (
          <>
            <QueueStatistics departmentId={departmentId} />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <QueuePanel departmentId={departmentId} canManage={canManage} revision={revision} onChanged={() => {}} />
              </div>
              <div className="min-w-0">
                <TodayEntries departmentId={departmentId} />
              </div>
            </div>
          </>
        )}
      </DashboardShell>
    </RequireAuth>
  );
}
