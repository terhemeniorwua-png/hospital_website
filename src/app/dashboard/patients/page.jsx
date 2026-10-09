'use client';

import { useState } from 'react';
import Link from 'next/link';
import RequireAuth from '../../../components/dashboard/RequireAuth';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import { AsyncView, Toolbar } from '../../../components/dashboard/primitives';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Form';
import { IconEye, IconSearch, IconUsers } from '../../../components/ui/Icon';
import { EmptyState, ListSkeleton } from '../../../components/ui/States';
import { Pagination } from '../../../components/ui/Pagination';
import { useDebounced } from '../../../hooks/useAsync';
import { PATIENT_STATUS_META, searchPatients } from '../../../lib/services/patients';
import { StatusBadge } from '../../../components/ui/Badge';

export default function PatientsDirectoryPage() {
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounced(term, 350);

  return (
    <RequireAuth roles={['DOCTOR', 'SUPER_ADMIN', 'HOSPITAL_ADMIN']}>
      <DashboardShell title="My patients" description="Find a patient by name or hospital number" wide>
        <Toolbar className="mb-5">
          <div className="relative w-full sm:max-w-md">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label="Search patients"
              placeholder="Name or hospital number"
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
        </Toolbar>

        <AsyncView
          fetcher={() =>
            searchPatients({
              q: debounced.trim() || undefined,
              page,
              limit: 20,
              sort: 'lastName',
              order: 'asc',
            })
          }
          deps={[debounced, page]}
          skeleton={<ListSkeleton count={6} />}
          empty={
            <EmptyState
              icon={<IconUsers className="size-7" />}
              title={debounced ? `No patients match “${debounced}”` : 'No patients registered yet'}
              description={
                debounced
                  ? 'Check the spelling, or search by hospital number instead.'
                  : 'Registered patients will be listed here.'
              }
            />
          }
        >
          {(response) => (
            <div className="space-y-4">
              <Card>
                <CardHeader
                  icon={<IconUsers className="size-5" />}
                  title="Directory"
                  description={`${response.pagination?.total ?? response.data.length} patients`}
                />
                <CardBody className="space-y-2">
                  {response.data.map((patient) => (
                    <Link
                      key={patient.id}
                      href={`/dashboard/patients/${patient.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4 transition hover:border-primary-300 hover:bg-primary-50"
                    >
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-ink">
                            {patient.fullName || `${patient.firstName} ${patient.lastName}`.trim()}
                          </span>
                          <Badge tone="muted" size="sm">{patient.hospitalNumber}</Badge>
                          <StatusBadge status={patient.status} meta={PATIENT_STATUS_META} size="sm" />
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {[patient.age != null ? `${patient.age} yrs` : null, patient.gender, patient.bloodGroup, patient.phone]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary-600">
                        Open chart <IconEye className="size-4" />
                      </span>
                    </Link>
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
