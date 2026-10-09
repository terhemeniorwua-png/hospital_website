'use client';

import { useState } from 'react';
import RequireAuth from '../../components/dashboard/RequireAuth';
import DashboardShell from '../../components/dashboard/DashboardShell';
import { ScopeBar, usePatientScope } from '../../components/dashboard/PatientScope';
import { AsyncView, Toolbar } from '../../components/dashboard/primitives';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Form';
import { IconClipboard, IconDownload, IconStethoscope } from '../../components/ui/Icon';
import { EmptyState, ListSkeleton, Notice } from '../../components/ui/States';
import { Pagination } from '../../components/ui/Pagination';
import { formatDate } from '../../lib/utils';
import { listDocuments } from '../../lib/services/billing';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'IDENTITY', label: 'Identity' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'CONSENT', label: 'Consent' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'CLINICAL', label: 'Clinical' },
  { value: 'LAB_REPORT', label: 'Lab report' },
  { value: 'IMAGING', label: 'Imaging' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'OTHER', label: 'Other' },
];

export default function DocumentsPage() {
  const scope = usePatientScope();
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  return (
    <RequireAuth>
      <DashboardShell title="Documents" description="Scans, reports and paperwork on file" wide>
        <div className="space-y-6">
          <ScopeBar scope={scope} />

          {!scope.patientId ? (
            <EmptyState
              icon={<IconStethoscope className="size-7" />}
              title={scope.isPatient ? 'No record linked' : 'Choose a patient first'}
              description={
                scope.isPatient
                  ? 'Your account is not linked to a patient chart yet.'
                  : 'Search for a patient above to see their documents.'
              }
            />
          ) : (
            <>
              <Toolbar>
                <Select
                  aria-label="Filter by category"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(1);
                  }}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </Toolbar>

              <AsyncView
                fetcher={() =>
                  listDocuments({ patientId: scope.patientId, page, limit: 15, ...(category ? { category } : {}) })
                }
                deps={[scope.patientId, category, page]}
                skeleton={<ListSkeleton count={5} />}
                empty={
                  <EmptyState
                    icon={<IconClipboard className="size-7" />}
                    title="No documents"
                    description="Uploaded paperwork will appear here."
                  />
                }
              >
                {(response) => (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader
                        icon={<IconClipboard className="size-5" />}
                        title="Documents"
                        description={`${response.pagination?.total ?? response.data.length} files`}
                      />
                      <CardBody className="space-y-3">
                        {response.data.map((doc) => (
                          <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">
                                {doc.title || doc.originalName || doc.name}
                              </p>
                              <p className="mt-0.5 text-xs text-muted">
                                {[doc.category, doc.mimeType || doc.fileType, doc.createdAt ? formatDate(doc.createdAt, 'short') : null]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Badge tone="muted" size="sm">{doc.category || 'File'}</Badge>
                              <a
                                href={`/api/documents/${doc.id}/download`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-50"
                                onClick={(event) => event.preventDefault()}
                              >
                                <IconDownload className="size-3.5" /> Open
                              </a>
                            </div>
                          </div>
                        ))}
                      </CardBody>
                    </Card>

                    <Pagination pagination={response.pagination} onPageChange={setPage} />
                  </div>
                )}
              </AsyncView>

              <Notice tone="info" title="Files are served by the API">
                Documents download straight from the backend so permissions are checked on every request.
              </Notice>
            </>
          )}
        </div>
      </DashboardShell>
    </RequireAuth>
  );
}
