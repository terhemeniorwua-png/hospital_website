'use client';

import RequireAuth from '../../components/dashboard/RequireAuth';
import DashboardShell from '../../components/dashboard/DashboardShell';
import { ScopeBar, usePatientScope } from '../../components/dashboard/PatientScope';
import { AsyncView } from '../../components/dashboard/primitives';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { IconClock, IconFile, IconStethoscope } from '../../components/ui/Icon';
import { EmptyState, ListSkeleton, Notice } from '../../components/ui/States';
import { formatDate, timeAgo } from '../../lib/utils';
import { TIMELINE_META, flattenTimeline, getRecords, getTimeline } from '../../lib/services/clinical';

function NeedsPatient() {
  return (
    <EmptyState
      icon={<IconStethoscope className="size-7" />}
      title="Choose a patient first"
      description="Search for a patient above to read their medical record."
    />
  );
}

function Timeline({ patientId }) {
  return (
    <AsyncView
      fetcher={() => getTimeline(patientId)}
      deps={[patientId]}
      skeleton={<ListSkeleton count={5} />}
      empty={
        <EmptyState
          icon={<IconClock className="size-7" />}
          title="Nothing on record yet"
          description="Appointments, consultations, results and prescriptions build this timeline as they happen."
        />
      }
      isEmpty={(payload) => flattenTimeline(payload?.data?.events || payload?.data).length === 0}
    >
      {(response) => {
        const events = flattenTimeline(response.data?.events || response.data);
        const counts = response.data?.counts || {};
        const summary = Object.entries(counts)
          .filter(([, value]) => Number(value) > 0)
          .map(([key, value]) => `${value} ${key}`)
          .join(' · ');
        return (
          <Card>
            <CardHeader
              icon={<IconClock className="size-5" />}
              title="Timeline"
              description={summary || 'All recorded activity'}
            />
            <CardBody>
              <ol className="relative space-y-4 border-l border-line pl-5">
                {events.map((event, index) => {
                  const meta = TIMELINE_META[event.timelineType] || { label: event.timelineType, tone: 'muted' };
                  const when = event.appointmentDate || event.createdAt || event.date;
                  return (
                    <li key={`${event.timelineType}-${event.id || index}`} className="relative">
                      <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-primary-500 ring-4 ring-white" />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={meta.tone} size="sm">{meta.label}</Badge>
                        <span className="text-sm font-medium text-ink">
                          {event.appointmentNumber ||
                            event.prescriptionNumber ||
                            event.orderNumber ||
                            event.consultationNumber ||
                            event.title ||
                            'Update'}
                        </span>
                        <span className="text-xs text-muted">{when ? formatDate(when, 'short') : timeAgo(event.createdAt)}</span>
                      </div>
                      {event.reason || event.status ? <p className="mt-0.5 text-sm text-muted">{event.reason || event.status}</p> : null}
                    </li>
                  );
                })}
              </ol>
            </CardBody>
          </Card>
        );
      }}
    </AsyncView>
  );
}

function RecordsList({ patientId }) {
  return (
    <AsyncView
      fetcher={() => getRecords(patientId, { limit: 50 })}
      deps={[patientId]}
      skeleton={<ListSkeleton count={4} />}
      empty={
        <EmptyState
          icon={<IconFile className="size-7" />}
          title="No documents on file"
          description="Clinical documents attached to this chart will be listed here."
        />
      }
    >
      {(response) => (
        <Card>
          <CardHeader icon={<IconFile className="size-5" />} title="Records" description={`${response.pagination?.total ?? response.data.length} documents`} />
          <CardBody className="space-y-2">
            {response.data.map((record) => (
              <div key={record.id} className="rounded-lg border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{record.title || record.recordType || record.name}</p>
                  <Badge tone="muted" size="sm">{record.recordType || record.category || 'Record'}</Badge>
                </div>
                {record.summary || record.notes ? (
                  <p className="mt-1 text-sm text-muted">{record.summary || record.notes}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted">{record.createdAt ? formatDate(record.createdAt, 'full') : ''}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </AsyncView>
  );
}

export default function RecordsPage() {
  const scope = usePatientScope();

  return (
    <RequireAuth>
      <DashboardShell title="Medical records" description="Timeline and clinical documents" wide>
        <div className="space-y-6">
          <ScopeBar scope={scope} />

          {!scope.patientId ? (
            scope.isPatient ? <Notice tone="warning" title="No record linked">Your account is not linked to a patient chart yet.</Notice> : <NeedsPatient />
          ) : (
            <>
              <Timeline patientId={scope.patientId} />
              <RecordsList patientId={scope.patientId} />
            </>
          )}
        </div>
      </DashboardShell>
    </RequireAuth>
  );
}
