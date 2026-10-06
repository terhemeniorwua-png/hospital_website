'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader, PageBody, PageSection } from '../components/layout/PageShell';
import { Card } from '../components/ui/Card';
import { Badge, Chip } from '../components/ui/Badge';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState, ErrorState, GridSkeleton, Notice } from '../components/ui/States';
import { Input } from '../components/ui/Form';
import { IconSearch, IconStethoscope, IconVideo } from '../components/ui/Icon';
import { useAsync, useDebounced } from '../hooks/useAsync';
import { listAvailableDoctors } from '../lib/services/appointments';
import { departments, telemedicine } from '../content/hospital';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../components/providers/AuthProvider';

/**
 * Public doctor directory.
 *
 * Data comes from GET /appointments/doctors, which the backend protects with the
 * `appointments:read` permission (every patient role holds it, anonymous callers
 * do not). A signed-out visitor therefore gets the department list plus a clear
 * sign-in call to action instead of a silent empty page.
 */
export default function DoctorsPage() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [term, setTerm] = useState(searchParams.get('q') || '');
  const [specialisation, setSpecialisation] = useState('all');
  const [onDutyOnly, setOnDutyOnly] = useState(false);
  const debouncedTerm = useDebounced(term, 300);

  const { data, loading, error, reload } = useAsync(async () => {
    if (!isAuthenticated) return [];
    const response = await listAvailableDoctors({ limit: 100, search: debouncedTerm || undefined });
    return response.data || [];
  }, [isAuthenticated, debouncedTerm]);

  const doctors = useMemo(() => data || [], [data]);

  const specialisations = useMemo(
    () => ['all', ...new Set(doctors.map((d) => d.specialization).filter(Boolean))].sort(),
    [doctors],
  );

  const visible = useMemo(
    () =>
      doctors.filter((doctor) => {
        if (specialisation !== 'all' && doctor.specialization !== specialisation) return false;
        if (onDutyOnly && !doctor.isOnDuty) return false;
        if (!debouncedTerm) return true;
        const needle = debouncedTerm.toLowerCase();
        return [doctor.name, doctor.specialization, doctor.subSpecialization]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(needle));
      }),
    [doctors, specialisation, onDutyOnly, debouncedTerm],
  );

  return (
    <>
      <PageHeader
        eyebrow="Find a doctor"
        title="Browse our consultants"
        description="Every consultant publishes their specialization and consultation fee. Book the doctor you want, at the first slot they have free."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Doctors' }]}
        actions={
          <ButtonLink href="/appointments" variant="primary" size="lg">
            Book an appointment
          </ButtonLink>
        }
      />

      <PageBody>
        {!isAuthenticated ? (
          <Notice tone="info" title="The live directory needs a session" className="mb-8" icon={<IconStethoscope className="size-4" />}>
            <p>
              Fees, on-duty status and availability are read live from the hospital scheduling system, which is
              access-controlled. Signing in takes a few seconds and lets you book immediately.
            </p>
            <div className="mt-3 flex gap-2">
              <ButtonLink href="/login" variant="primary" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" variant="secondary" size="sm">
                Create an account
              </ButtonLink>
            </div>
          </Notice>
        ) : null}

        {/* Department shortcuts always render, even signed out. */}
        <PageSection title="Browse by department">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {departments.map((department) => (
              <li key={department.slug}>
                <Card interactive className="h-full p-4">
                  <p className="text-sm font-semibold text-ink">{department.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{department.blurb}</p>
                  <ButtonLink
                    href={`/departments#${department.slug}`}
                    variant="ghost"
                    size="sm"
                    className="mt-3 -ml-2"
                  >
                    About this department
                  </ButtonLink>
                </Card>
              </li>
            ))}
          </ul>
        </PageSection>

        <PageSection title="All consultants">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <label htmlFor="doctor-search" className="sr-only">
                Search doctors by name or specialty
              </label>
              <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted" />
              <Input
                id="doctor-search"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search by name or specialty"
                className="pl-11"
                containerClassName="w-full"
              />
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={onDutyOnly}
                onChange={(event) => setOnDutyOnly(event.target.checked)}
                className="size-4 rounded border-line accent-primary-600"
              />
              On duty today only
            </label>
          </div>

          {isAuthenticated && specialisations.length > 2 ? (
            <div className="sa-hide-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
              {specialisations.map((item) => (
                <Chip key={item} active={specialisation === item} onClick={() => setSpecialisation(item)} className="shrink-0">
                  {item === 'all' ? 'All specialties' : item}
                </Chip>
              ))}
            </div>
          ) : null}

          {/* Results */}
          <div className="mt-7">
            {!isAuthenticated ? (
              <Card className="p-6 text-center sm:p-10">
                <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary-50 text-primary-600">
                  <IconStethoscope className="size-7" />
                </span>
                <h3 className="text-base font-semibold text-ink">Sign in to see our consultants</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                  Doctor profiles, fees and live availability come from the scheduling system. Once you sign in you can
                  book any consultant directly from this page.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                  <ButtonLink href="/login" variant="primary" size="lg">
                    Sign in
                  </ButtonLink>
                  <ButtonLink href="/register" variant="secondary" size="lg">
                    Create an account
                  </ButtonLink>
                </div>
              </Card>
            ) : loading ? (
              <GridSkeleton count={6} />
            ) : error ? (
              <ErrorState title="The doctor directory is unavailable" description={error.message} onRetry={reload} />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<IconSearch className="size-6" />}
                title="No consultants match your filters"
                description="Try a different name, clear the specialty filter, or include doctors who are not on duty today."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setTerm('');
                      setSpecialisation('all');
                      setOnDutyOnly(false);
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <>
                <p className="mb-4 text-sm text-muted">
                  Showing <span className="font-medium text-ink">{visible.length}</span> of{' '}
                  <span className="font-medium text-ink">{doctors.length}</span> consultants
                </p>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((doctor) => (
                    <li key={doctor.id}>
                      <DoctorCard doctor={doctor} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </PageSection>

        <PageSection title="Reviews by video or phone">
          <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
              <IconVideo className="size-6" />
            </span>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-ink">{telemedicine.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{telemedicine.description}</p>
            </div>
            <ButtonLink href="/appointments?type=FOLLOW_UP" variant="soft" size="md" className="shrink-0">
              Book a review
            </ButtonLink>
          </Card>
        </PageSection>
      </PageBody>
    </>
  );
}

function DoctorCard({ doctor }) {
  const initials = `${doctor.user?.firstName?.[0] || ''}${doctor.user?.lastName?.[0] || ''}`;
  const onDuty = Boolean(doctor.isOnDuty);

  return (
    <Card interactive className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className={cn(
            'grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-base font-bold text-primary-800 uppercase',
            !onDuty && 'opacity-60 grayscale',
          )}
        >
          {initials || 'DR'}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-ink">{doctor.name}</h3>
          <p className="mt-0.5 truncate text-sm font-medium text-primary-700">{doctor.specialization}</p>
          {doctor.subSpecialization ? (
            <p className="mt-0.5 truncate text-xs text-muted">{doctor.subSpecialization}</p>
          ) : null}
        </div>
        <Badge tone={onDuty ? 'success' : 'muted'} size="sm">
          {onDuty ? 'On duty' : 'Off today'}
        </Badge>
      </div>

      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted">Consultation</dt>
          <dd className="font-semibold text-ink tabular-nums">{formatCurrency(doctor.consultationFee)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">Appointment length</dt>
          <dd className="font-medium text-ink">{doctor.slotDurationMinutes} minutes</dd>
        </div>
      </dl>

      <div className="mt-auto flex gap-2 pt-5">
        <ButtonLink href={`/doctors/${doctor.id}`} variant="secondary" size="sm" className="flex-1">
          Profile
        </ButtonLink>
        <ButtonLink href={`/appointments?doctorId=${doctor.id}`} variant="primary" size="sm" className="flex-1">
          Book
        </ButtonLink>
      </div>
    </Card>
  );
}
