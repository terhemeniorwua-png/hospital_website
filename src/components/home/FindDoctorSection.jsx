'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Badge, Chip } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ButtonLink, IconButton } from '../ui/Button';
import { EmptyState, ErrorState, GridSkeleton, Notice } from '../ui/States';
import { IconSearch, IconStethoscope, IconUser } from '../ui/Icon';
import { useAsync } from '../../hooks/useAsync';
import { listAvailableDoctors } from '../../lib/services/appointments';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../providers/AuthProvider';

/**
 * "Find a doctor" homepage section.
 *
 * Reads the live directory from GET /appointments/doctors. That endpoint
 * requires a session (patient permission `appointments:read`), so a signed-out
 * visitor is offered a clear sign-in path instead of an empty grid. The reason
 * is stated in the UI rather than hidden.
 */
export default function FindDoctorSection() {
  const { isAuthenticated, openAuthModal, isLoading: authLoading } = useAuth();
  const reduceMotion = useReducedMotion();
  const [specialisation, setSpecialisation] = useState('all');

  const { data, loading, error, reload } = useAsync(async () => {
    if (!isAuthenticated) return null;
    const response = await listAvailableDoctors({ limit: 24 });
    return response.data || [];
  }, [isAuthenticated]);

  const doctors = useMemo(() => data || [], [data]);

  const specialisations = useMemo(
    () => ['all', ...new Set(doctors.map((doctor) => doctor.specialization).filter(Boolean))],
    [doctors],
  );

  const visible = useMemo(
    () => (specialisation === 'all' ? doctors : doctors.filter((d) => d.specialization === specialisation)),
    [doctors, specialisation],
  );

  return (
    <section className="sa-section bg-white" aria-labelledby="find-a-doctor-heading">
      <div className="sa-container">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="sa-eyebrow">
              <IconStethoscope className="size-4" />
              Book with a named doctor
            </span>
            <h2 id="find-a-doctor-heading" className="mt-3 text-3xl font-bold tracking-tight text-ink text-balance sm:text-4xl">
              Our specialists, and what a visit costs
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              Every consultant publishes their fee and clinic days before you book. No surprises at the counter.
            </p>
          </div>
          <ButtonLink href="/doctors" variant="secondary" size="md">
            Browse all doctors
          </ButtonLink>
        </div>

        <div className="mt-8">
          {!isAuthenticated ? (
            <Card className="p-6 sm:p-8">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
                  <IconUser className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-ink">Sign in to see the live directory</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Our doctor directory reads from the hospital scheduling system, which is protected by your
                    account. Signing in takes a few seconds and keeps your bookings, results and prescriptions in one place.
                  </p>
                </div>
                <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                  <ButtonLink href="/login" variant="primary" size="md" className="flex-1 sm:flex-none">
                    Sign in
                  </ButtonLink>
                  <ButtonLink href="/register" variant="secondary" size="md" className="flex-1 sm:flex-none">
                    Create account
                  </ButtonLink>
                </div>
              </div>
              <Notice tone="info" className="mt-6">
                <p>
                  You can read every department, service and patient guide on this site without an account. Live
                  availability, prices per doctor and your own health data require a session.
                </p>
              </Notice>
            </Card>
          ) : loading || authLoading ? (
            <GridSkeleton count={3} />
          ) : error ? (
            <ErrorState
              title="The directory is unavailable right now"
              description={error.message}
              onRetry={reload}
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<IconSearch className="size-6" />}
              title="No consultants match that filter"
              description="Try another department, or view the full directory."
              action={
                <ButtonLink href="/doctors" variant="secondary" size="sm">
                  Clear filters
                </ButtonLink>
              }
            />
          ) : (
            <>
              {specialisations.length > 2 ? (
                <div className="sa-hide-scrollbar mb-7 flex gap-2 overflow-x-auto pb-1">
                  {specialisations.map((item) => (
                    <Chip
                      key={item}
                      active={specialisation === item}
                      onClick={() => setSpecialisation(item)}
                      className="shrink-0"
                    >
                      {item === 'all' ? 'All departments' : item}
                    </Chip>
                  ))}
                </div>
              ) : null}

              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.slice(0, 6).map((doctor, index) => (
                  <motion.li
                    key={doctor.id}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.3) }}
                  >
                    <DoctorCard doctor={doctor} />
                  </motion.li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function DoctorCard({ doctor }) {
  const initials = `${doctor.user?.firstName?.[0] || ''}${doctor.user?.lastName?.[0] || ''}`;

  return (
    <Card interactive className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-sm font-bold text-primary-800 uppercase"
        >
          {initials || 'DR'}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-ink">{doctor.name}</h3>
          <p className="truncate text-sm text-primary-700">{doctor.specialization}</p>
          {doctor.subSpecialization ? (
            <p className="mt-0.5 truncate text-xs text-muted">{doctor.subSpecialization}</p>
          ) : null}
        </div>
        {doctor.isOnDuty ? (
          <Badge tone="success" size="sm">
            On duty
          </Badge>
        ) : (
          <Badge tone="muted" size="sm">
            Off today
          </Badge>
        )}
      </div>

      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted">Consultation</dt>
          <dd className="font-semibold text-ink tabular-nums">{formatCurrency(doctor.consultationFee)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">Slot length</dt>
          <dd className="font-medium text-ink">{doctor.slotDurationMinutes} minutes</dd>
        </div>
      </dl>

      <div className="mt-5 flex gap-2 pt-1">
        <ButtonLink href={`/doctors/${doctor.id}`} variant="soft" size="sm" className="flex-1">
          View profile
        </ButtonLink>
        <ButtonLink href={`/appointments?doctorId=${doctor.id}`} variant="primary" size="sm" className="flex-1">
          Book
        </ButtonLink>
      </div>
    </Card>
  );
}
