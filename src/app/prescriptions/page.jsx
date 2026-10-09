'use client';

import { useState } from 'react';
import RequireAuth from '../../components/dashboard/RequireAuth';
import DashboardShell from '../../components/dashboard/DashboardShell';
import { ScopeBar, usePatientScope } from '../../components/dashboard/PatientScope';
import { AsyncView, Toolbar } from '../../components/dashboard/primitives';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Form';
import { IconPill, IconStethoscope } from '../../components/ui/Icon';
import { EmptyState, ListSkeleton } from '../../components/ui/States';
import { Pagination } from '../../components/ui/Pagination';
import { formatDate } from '../../lib/utils';
import { PRESCRIPTION_STATUS_META, listPrescriptions } from '../../lib/services/pharmacy';

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'PENDING_VERIFICATION', label: 'Awaiting verification' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'PARTIALLY_DISPENSED', label: 'Partially dispensed' },
  { value: 'DISPENSED', label: 'Dispensed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function PrescriptionsPage() {
  const scope = usePatientScope();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  return (
    <RequireAuth>
      <DashboardShell title="Prescriptions" description="Medication prescribed for the selected chart" wide>
        <div className="space-y-6">
          <ScopeBar scope={scope} />

          {!scope.patientId ? (
            <EmptyState
              icon={<IconStethoscope className="size-7" />}
              title={scope.isPatient ? 'No record linked' : 'Choose a patient first'}
              description={
                scope.isPatient
                  ? 'Your account is not linked to a patient chart yet.'
                  : 'Search for a patient above to see their prescriptions.'
              }
            />
          ) : (
            <>
              <Toolbar>
                <Select
                  aria-label="Filter by status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </Toolbar>

              <AsyncView
                fetcher={() => listPrescriptions({ patientId: scope.patientId, page, limit: 15, ...(status ? { status } : {}) })}
                deps={[scope.patientId, status, page]}
                skeleton={<ListSkeleton count={5} />}
                empty={
                  <EmptyState
                    icon={<IconPill className="size-7" />}
                    title="No prescriptions"
                    description="Medication prescribed during an encounter will appear here."
                  />
                }
              >
                {(response) => (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader
                        icon={<IconPill className="size-5" />}
                        title="Prescriptions"
                        description={`${response.pagination?.total ?? response.data.length} total`}
                      />
                      <CardBody className="space-y-3">
                        {response.data.map((rx) => (
                          <div key={rx.id} className="rounded-lg border border-line p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-ink">{rx.prescriptionNumber}</p>
                                <p className="mt-0.5 text-xs text-muted">
                                  {[rx.prescribedByName, rx.patientName, rx.createdAt ? formatDate(rx.createdAt, 'full') : null]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              </div>
                              <StatusBadge status={rx.status} meta={PRESCRIPTION_STATUS_META} size="sm" />
                            </div>
                            {rx.notes ? <p className="mt-2 text-sm text-muted">{rx.notes}</p> : null}
                          </div>
                        ))}
                      </CardBody>
                    </Card>

                    <Pagination pagination={response.pagination} onPageChange={setPage} />
                  </div>
                )}
              </AsyncView>
            </>
          )}
        </div>
      </DashboardShell>
    </RequireAuth>
  );
}
