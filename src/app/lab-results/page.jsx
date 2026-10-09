'use client';

import { useState } from 'react';
import RequireAuth from '../../components/dashboard/RequireAuth';
import DashboardShell from '../../components/dashboard/DashboardShell';
import { ScopeBar, usePatientScope } from '../../components/dashboard/PatientScope';
import { AsyncView, Toolbar } from '../../components/dashboard/primitives';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Form';
import { IconFlask, IconStethoscope } from '../../components/ui/Icon';
import { EmptyState, ListSkeleton, Notice } from '../../components/ui/States';
import { Pagination } from '../../components/ui/Pagination';
import { formatDate } from '../../lib/utils';
import { abnormalResult, getLabResults } from '../../lib/services/clinical';

const FLAG_OPTIONS = [
  { value: '', label: 'Any result' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL_LOW', label: 'Critically low' },
  { value: 'CRITICAL_HIGH', label: 'Critically high' },
];

function flagTone(flag) {
  const value = String(flag || '').toUpperCase();
  if (value.includes('CRITICAL')) return 'danger';
  if (value.includes('HIGH') || value.includes('LOW')) return 'warning';
  return 'success';
}

export default function LabResultsPage() {
  const scope = usePatientScope();
  const [flag, setFlag] = useState('');
  const [page, setPage] = useState(1);

  return (
    <RequireAuth>
      <DashboardShell title="Lab results" description="Published laboratory results" wide>
        <div className="space-y-6">
          <ScopeBar scope={scope} />

          {!scope.patientId ? (
            <EmptyState
              icon={<IconStethoscope className="size-7" />}
              title={scope.isPatient ? 'No record linked' : 'Choose a patient first'}
              description={
                scope.isPatient
                  ? 'Your account is not linked to a patient chart yet.'
                  : 'Search for a patient above to see their results.'
              }
            />
          ) : (
            <>
              <Toolbar>
                <Select
                  aria-label="Filter by result flag"
                  value={flag}
                  onChange={(event) => {
                    setFlag(event.target.value);
                    setPage(1);
                  }}
                >
                  {FLAG_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </Toolbar>

              {scope.isPatient ? (
                <Notice tone="info" title="Only published results are shown">
                  Results appear here once they have been reviewed and released by the laboratory.
                </Notice>
              ) : null}

              <AsyncView
                fetcher={() =>
                  getLabResults({ patientId: scope.patientId, page, limit: 15, ...(flag ? { flag } : {}) })
                }
                deps={[scope.patientId, flag, page]}
                skeleton={<ListSkeleton count={5} />}
                empty={
                  <EmptyState
                    icon={<IconFlask className="size-7" />}
                    title="No results yet"
                    description="Published test results will appear here."
                  />
                }
              >
                {(response) => (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader
                        icon={<IconFlask className="size-5" />}
                        title="Laboratory results"
                        description={`${response.pagination?.total ?? response.data.length} results`}
                      />
                      <CardBody className="space-y-3">
                        {response.data.map((row) => {
                          const abnormal = abnormalResult(row);
                          return (
                            <div key={row.id} className="rounded-lg border border-line p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-ink">
                                    {row.test?.name || row.testName || 'Laboratory test'}
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted">
                                    {row.test?.code ? `${row.test.code} · ` : ''}
                                    {row.performedAt ? formatDate(row.performedAt, 'full') : ''}
                                  </p>
                                </div>
                                <Badge tone={flagTone(row.flag)} size="sm">
                                  {row.flag || (abnormal ? 'Out of range' : 'Normal')}
                                </Badge>
                              </div>

                              <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                                <span className="text-lg font-bold tabular-nums text-ink">
                                  {row.value != null && row.value !== '' ? row.value : '—'}
                                  {row.unit ? <span className="ml-1 text-sm font-medium text-muted">{row.unit}</span> : null}
                                </span>
                                {row.referenceRange ? (
                                  <span className="text-xs text-muted">Reference: {row.referenceRange}</span>
                                ) : row.test?.referenceRangeText ? (
                                  <span className="text-xs text-muted">Reference: {row.test.referenceRangeText}</span>
                                ) : null}
                              </div>

                              {row.notes || row.comment ? (
                                <p className="mt-2 text-sm text-muted">{row.notes || row.comment}</p>
                              ) : null}
                            </div>
                          );
                        })}
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
