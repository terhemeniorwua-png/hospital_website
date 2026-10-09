'use client';

import { useState } from 'react';
import RequireAuth from './RequireAuth';
import DashboardShell from './DashboardShell';
import SoapEditor from './SoapEditor';
import { AsyncView } from './primitives';
import { Card, CardBody, CardHeader, DetailRow, SectionHeading } from '../ui/Card';
import { Avatar, Badge, StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  IconCalendar,
  IconClock,
  IconFile,
  IconFlask,
  IconPill,
  IconPlus,
  IconShield,
  IconStethoscope,
} from '../ui/Icon';
import { CardSkeleton, EmptyState, ListSkeleton, Notice } from '../ui/States';
import { cn, formatDate, timeAgo } from '../../lib/utils';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../providers/AuthProvider';
import { getPatient, ageFromDob, patientName } from '../../lib/services/patients';
import {
  TIMELINE_META,
  flattenTimeline,
  getConsultations,
  getLabResults,
  getTimeline,
} from '../../lib/services/clinical';
import { listPrescriptions } from '../../lib/services/pharmacy';
import { listAppointments, APPOINTMENT_STATUS_META } from '../../lib/services/appointments';
import { PRESCRIPTION_STATUS_META } from '../../lib/services/pharmacy';
import { CONSULTATION_STATUS_META } from '../../lib/services/consultations';

const TABS = [
  { key: 'overview', label: 'Overview', icon: IconStethoscope },
  { key: 'timeline', label: 'Timeline', icon: IconClock },
  { key: 'consultations', label: 'Consultations', icon: IconFile },
  { key: 'prescriptions', label: 'Prescriptions', icon: IconPill },
  { key: 'labs', label: 'Lab results', icon: IconFlask },
];

function PatientHeader({ patient, onRefresh }) {
  if (!patient) return null;
  const age = patient.age ?? ageFromDob(patient.dateOfBirth);

  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar firstName={patient.firstName} lastName={patient.lastName} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-ink">{patientName(patient)}</h1>
              <Badge tone="muted" size="sm">{patient.hospitalNumber}</Badge>
              {patient.status ? <StatusBadge status={patient.status} size="sm" /> : null}
            </div>
            <p className="mt-1 text-sm text-muted">
              {[age != null ? `${age} yrs` : null, patient.gender, patient.bloodGroup, patient.phone, patient.email]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {patient.address ? <p className="mt-0.5 text-xs text-muted">{patient.address}</p> : null}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          Refresh
        </Button>
      </CardBody>
    </Card>
  );
}

function ClinicalSummary({ patientId }) {
  return (
    <AsyncView
      fetcher={() => getPatient(patientId, { includeClinical: true })}
      deps={[patientId]}
      skeleton={<Card><CardSkeleton lines={5} /></Card>}
      isEmpty={(payload) => !payload?.data}
    >
      {(response) => {
        const patient = response.data || {};
        const allergies = patient.allergies || [];
        const conditions = patient.conditions || patient.medicalHistory || [];
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader icon={<IconShield className="size-5" />} title="Allergies & alerts" />
              <CardBody>
                {allergies.length ? (
                  <ul className="space-y-2">
                    {allergies.map((allergy) => (
                      <li key={allergy.id || allergy.allergen} className="flex items-start justify-between gap-3 rounded-lg border border-danger-100 bg-danger-50 p-3">
                        <div>
                          <p className="text-sm font-semibold text-danger-700">{allergy.allergen || allergy.name}</p>
                          <p className="mt-0.5 text-xs text-danger-600/80">
                            {[allergy.severity, allergy.reaction, allergy.type].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        {allergy.severity ? <Badge tone="danger" size="sm">{allergy.severity}</Badge> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState compact icon={<IconShield className="size-6" />} title="No allergies recorded" description="Nothing has been flagged for this patient." />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader icon={<IconFile className="size-5" />} title="Clinical summary" />
              <CardBody>
                <dl className="divide-y divide-line">
                  <DetailRow label="Blood group" value={patient.bloodGroup || '—'} />
                  <DetailRow label="Genotype" value={patient.genotype || '—'} />
                  <DetailRow label="Known conditions" value={conditions.length || 'None recorded'} />
                  <DetailRow label="Emergency contact" value={patient.emergencyContactName || '—'} />
                  <DetailRow label="Registered" value={patient.createdAt ? formatDate(patient.createdAt, 'short') : '—'} />
                </dl>
                {conditions.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {conditions.slice(0, 8).map((condition, index) => (
                      <Badge key={condition.id || condition.name || index} tone="warning" size="sm">
                        {condition.name || condition.conditionName || condition}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </div>
        );
      }}
    </AsyncView>
  );
}

function TimelinePanel({ patientId }) {
  return (
    <AsyncView
      fetcher={() => getTimeline(patientId)}
      deps={[patientId]}
      skeleton={<Card><CardSkeleton lines={6} /></Card>}
      empty={
        <EmptyState
          icon={<IconClock className="size-7" />}
          title="No history yet"
          description="Appointments, consultations, results and prescriptions will build this timeline."
        />
      }
      isEmpty={(payload) => flattenTimeline(payload?.data?.events || payload?.data).length === 0}
    >
      {(response) => {
        const events = flattenTimeline(response.data?.events || response.data);
        const counts = response.data?.counts || {};
        return (
          <Card>
            <CardHeader
              icon={<IconClock className="size-5" />}
              title="Clinical timeline"
              description={Object.entries(counts).map(([key, value]) => `${value} ${key}`).join(' · ') || undefined}
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
                      {event.status || event.reason ? (
                        <p className="mt-0.5 text-sm text-muted">{event.reason || event.status}</p>
                      ) : null}
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

function ConsultationsPanel({ patientId, canWrite }) {
  const [editor, setEditor] = useState(null); // { mode, consultation }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Encounters recorded for this patient.</p>
        {canWrite ? (
          <Button size="sm" onClick={() => setEditor({ mode: 'create' })}>
            <IconPlus className="mr-1.5 size-4" /> Start consultation
          </Button>
        ) : null}
      </div>

      <AsyncView
        fetcher={() => getConsultations({ patientId, limit: 20 })}
        deps={[patientId, editor]}
        skeleton={<ListSkeleton count={4} />}
        empty={
          <EmptyState
            icon={<IconStethoscope className="size-7" />}
            title="No consultations recorded"
            description={canWrite ? 'Start an encounter to record findings for this patient.' : 'Encounters will appear here.'}
            action={
              canWrite ? (
                <Button onClick={() => setEditor({ mode: 'create' })}>
                  <IconPlus className="mr-1.5 size-4" /> Start consultation
                </Button>
              ) : null
            }
          />
        }
      >
        {(response) => (
          <Card>
            <CardHeader icon={<IconStethoscope className="size-5" />} title="Consultations" description={`${response.pagination?.total ?? response.data.length} recorded`} />
            <CardBody className="space-y-3">
              {response.data.map((consultation) => (
                <div key={consultation.id} className="rounded-lg border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{consultation.consultationNumber}</p>
                        <StatusBadge status={consultation.status} meta={CONSULTATION_STATUS_META} size="sm" />
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {consultation.doctorName ? `${consultation.doctorName} · ` : ''}
                        {consultation.createdAt ? formatDate(consultation.createdAt, 'full') : ''}
                      </p>
                    </div>
                    {canWrite ? (
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditor({ mode: 'edit', consultation })}>
                          Edit note
                        </Button>
                        {consultation.status !== 'COMPLETED' ? (
                          <Button size="sm" onClick={() => setEditor({ mode: 'complete', consultation })}>
                            Complete
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {consultation.chiefComplaint ? (
                    <p className="mt-2 text-sm text-ink">
                      <span className="font-semibold">Chief complaint:</span> {consultation.chiefComplaint}
                    </p>
                  ) : null}
                  {consultation.diagnosisSummary ? (
                    <p className="mt-1 text-sm text-ink">
                      <span className="font-semibold">Assessment:</span> {consultation.diagnosisSummary}
                    </p>
                  ) : null}
                  {consultation.treatmentPlan ? (
                    <p className="mt-1 text-sm text-muted">{consultation.treatmentPlan}</p>
                  ) : null}
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </AsyncView>

      {editor ? (
        <SoapEditor
          open
          mode={editor.mode}
          patientId={patientId}
          consultation={editor.consultation}
          onClose={() => setEditor(null)}
          onSaved={() => setEditor(null)}
        />
      ) : null}
    </div>
  );
}

function PrescriptionsPanel({ patientId }) {
  return (
    <AsyncView
      fetcher={() => listPrescriptions({ patientId, limit: 20 })}
      deps={[patientId]}
      skeleton={<ListSkeleton count={4} />}
      empty={<EmptyState icon={<IconPill className="size-7" />} title="No prescriptions" description="Medication prescribed for this patient will be listed here." />}
    >
      {(response) => (
        <Card>
          <CardHeader icon={<IconPill className="size-5" />} title="Prescriptions" description={`${response.pagination?.total ?? response.data.length} total`} />
          <CardBody className="space-y-3">
            {response.data.map((rx) => (
              <div key={rx.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{rx.prescriptionNumber}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {[rx.prescribedByName, rx.createdAt ? formatDate(rx.createdAt, 'short') : null].filter(Boolean).join(' · ')}
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

function LabsPanel({ patientId }) {
  return (
    <AsyncView
      fetcher={() => getLabResults({ patientId, limit: 20 })}
      deps={[patientId]}
      skeleton={<ListSkeleton count={4} />}
      empty={<EmptyState icon={<IconFlask className="size-7" />} title="No lab results" description="Published results for this patient will appear here." />}
    >
      {(response) => (
        <Card>
          <CardHeader icon={<IconFlask className="size-5" />} title="Laboratory results" description={`${response.pagination?.total ?? response.data.length} results`} />
          <CardBody className="space-y-3">
            {response.data.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{row.test?.name || row.testName || 'Test'}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {row.value != null && row.value !== '' ? `${row.value} ${row.unit || ''}`.trim() : 'Result pending'}
                    {row.performedAt ? ` · ${formatDate(row.performedAt, 'short')}` : ''}
                  </p>
                </div>
                {row.flag ? <Badge tone={String(row.flag).includes('CRITICAL') ? 'danger' : 'warning'} size="sm">{row.flag}</Badge> : null}
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </AsyncView>
  );
}

function UpcomingForPatient({ patientId }) {
  return (
    <AsyncView
      fetcher={() => listAppointments({ patientId, limit: 5 })}
      deps={[patientId]}
      skeleton={<ListSkeleton count={2} />}
      empty={<EmptyState compact icon={<IconCalendar className="size-6" />} title="No appointments" description="Bookings for this patient will appear here." />}
    >
      {(response) => (
        <Card>
          <CardHeader icon={<IconCalendar className="size-5" />} title="Recent appointments" />
          <CardBody className="space-y-2">
            {response.data.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {formatDate(appointment.appointmentDate, 'full')} · {appointment.startTime}
                  </p>
                  <p className="truncate text-xs text-muted">{appointment.appointmentNumber}</p>
                </div>
                <StatusBadge status={appointment.status} meta={APPOINTMENT_STATUS_META} size="sm" />
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </AsyncView>
  );
}

export default function PatientWorkspace({ patientId }) {
  const { permissions = [] } = useAuth();
  const { data, loading, error, reload } = useAsync(() => getPatient(patientId, { includeClinical: true }), [patientId]);
  const [tab, setTab] = useState('overview');
  const patient = data?.data;
  const canWrite = permissions?.includes('consultations:write');

  return (
    <RequireAuth roles={['DOCTOR', 'SUPER_ADMIN', 'HOSPITAL_ADMIN']}>
      <DashboardShell title={loading ? 'Loading chart…' : patientName(patient) || 'Clinical workspace'} description={patient?.hospitalNumber || 'Patient chart'} wide>
        <div className="space-y-6">
          {loading ? <Card><CardSkeleton lines={4} /></Card> : null}
          {error ? (
            <Notice tone="danger" title="Could not load this chart">
              {error?.message}
              <div className="mt-3">
                <Button size="sm" variant="secondary" onClick={reload}>Try again</Button>
              </div>
            </Notice>
          ) : null}

          {!loading && !error && !patient ? (
            <EmptyState icon={<IconFile className="size-7" />} title="Patient not found" description="This chart may have been removed or you may not have access to it." />
          ) : null}

          {patient ? (
            <>
              <PatientHeader patient={patient} onRefresh={reload} />

              <nav className="flex flex-wrap gap-1 border-b border-line" aria-label="Chart sections">
                {TABS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    aria-current={tab === item.key ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition',
                      tab === item.key
                        ? 'border-primary-600 text-primary-700'
                        : 'border-transparent text-muted hover:text-ink',
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </button>
                ))}
              </nav>

              {tab === 'overview' ? (
                <div className="space-y-6">
                  <ClinicalSummary patientId={patientId} />
                  <UpcomingForPatient patientId={patientId} />
                </div>
              ) : null}
              {tab === 'timeline' ? <TimelinePanel patientId={patientId} /> : null}
              {tab === 'consultations' ? (
                <ConsultationsPanel patientId={patientId} canWrite={canWrite} />
              ) : null}
              {tab === 'prescriptions' ? <PrescriptionsPanel patientId={patientId} /> : null}
              {tab === 'labs' ? <LabsPanel patientId={patientId} /> : null}
            </>
          ) : null}
        </div>
      </DashboardShell>
    </RequireAuth>
  );
}
