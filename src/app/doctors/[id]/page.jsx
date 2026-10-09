'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader, PageBody, PageSection, CtaStrip } from '../../../components/layout/PageShell';
import { Card, DataTile } from '../../../components/ui/Card';
import { Avatar, Badge } from '../../../components/ui/Badge';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { ErrorState, GridSkeleton, Notice } from '../../../components/ui/States';
import { IconArrowRight, IconCalendar, IconCheck, IconStethoscope, IconVideo } from '../../../components/ui/Icon';
import { useAsync } from '../../../hooks/useAsync';
import { getAvailability, listAvailableDoctors } from '../../../lib/services/appointments';
import { addDays, cn, formatCurrency, toDateInputValue } from '../../../lib/utils';
import { useAuth } from '../../../components/providers/AuthProvider';

/**
 * Doctor profile.
 *
 * Everything on this page is real: the profile comes from the directory, the
 * "next available" strip calls the availability endpoint for the next two weeks,
 * and the booking link carries the doctor id into the step-by-step flow.
 */
export default function DoctorProfilePage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [date, setDate] = useState(toDateInputValue(addDays(new Date(), 1)));

  const { data, loading, error, reload } = useAsync(async () => {
    if (!isAuthenticated) return null;
    const response = await listAvailableDoctors({ limit: 100 });
    return (response.data || []).find((doctor) => String(doctor.id) === String(id)) || null;
  }, [isAuthenticated, id]);

  const doctor = data;

  const { data: availability, error: availabilityError } = useAsync(async () => {
    if (!doctor || !date) return null;
    const response = await getAvailability({ doctorId: doctor.id, date });
    return response.data || null;
  }, [doctor?.id, date]);

  const nextSlots = useMemo(() => {
    if (!availability?.slots) return [];
    return availability.slots.filter((slot) => slot.isAvailable).slice(0, 6);
  }, [availability]);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Doctors', href: '/doctors' },
          { label: doctor?.name || 'Profile' },
        ]}
        title={loading ? 'Loading profile…' : doctor?.name || 'Doctor not found'}
        description={
          doctor
            ? `${doctor.specialization}${doctor.subSpecialization ? ` · ${doctor.subSpecialization}` : ''}`
            : 'This consultant could not be found in the scheduling system.'
        }
        actions={
          doctor ? (
            <>
              <ButtonLink href={`/appointments?doctorId=${doctor.id}`} variant="primary" size="lg">
                <IconCalendar className="size-5" />
                Book with {doctor.name.split(' ')[0]}
              </ButtonLink>
              <ButtonLink href="/doctors" variant="secondary" size="lg">
                All doctors
              </ButtonLink>
            </>
          ) : null
        }
      />

      <PageBody>
        {loading ? (
          <GridSkeleton count={3} />
        ) : error ? (
          <ErrorState title="We could not load this profile" description={error.message} onRetry={reload} />
        ) : !doctor ? (
          <Notice tone="warning" title="Consultant not found">
            <p>
              This profile is not in the scheduling system. It may have been retired or the link may be wrong.{' '}
              <Link href="/doctors" className="font-semibold underline">
                Browse all doctors
              </Link>
              .
            </p>
          </Notice>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            {/* Main column */}
            <div>
              <PageSection title="About this consultation">
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar firstName={doctor.user?.firstName} lastName={doctor.user?.lastName} name={doctor.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-ink">{doctor.name}</h2>
                      <p className="mt-0.5 text-sm font-medium text-primary-700">{doctor.specialization}</p>
                      {doctor.subSpecialization ? (
                        <p className="mt-0.5 text-sm text-muted">{doctor.subSpecialization}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone={doctor.isOnDuty ? 'success' : 'muted'} size="sm">
                          {doctor.isOnDuty ? 'On duty today' : 'Not on duty today'}
                        </Badge>
                        <Badge tone="primary" size="sm">
                          {doctor.slotDurationMinutes}-minute slots
                        </Badge>
                        <Badge tone="teal" size="sm">
                          {formatCurrency(doctor.consultationFee)} consultation
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-line pt-5">
                    <p className="text-sm leading-relaxed text-muted">
                      {doctor.name} sees patients in the {doctor.specialization} clinic. Book this consultant directly to
                      secure a specific slot rather than taking a generic appointment. Investigations, imaging and any
                      prescriptions issued during your visit are itemised separately on your invoice.
                    </p>
                  </div>
                </Card>
              </PageSection>

              <PageSection title="Next available slots" description="Live from the scheduling system. Pick a date to see free slots.">
                <Card className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium text-ink">Appointment date</span>
                      <input
                        type="date"
                        value={date}
                        min={toDateInputValue()}
                        onChange={(event) => setDate(event.target.value)}
                        className="h-11 rounded-lg border border-line bg-white px-3.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 focus:outline-none"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2 sm:ml-auto">
                      {[1, 2, 7, 14].map((offset) => {
                        const target = toDateInputValue(addDays(new Date(), offset));
                        return (
                          <button
                            key={offset}
                            type="button"
                            onClick={() => setDate(target)}
                            className={cn(
                              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                              date === target
                                ? 'border-primary-600 bg-primary-600 text-white'
                                : 'border-line bg-white text-ink hover:border-primary-300',
                            )}
                          >
                            {offset === 1 ? 'Tomorrow' : offset === 2 ? 'In 2 days' : `In ${offset} days`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6">
                    {availabilityError ? (
                      <Notice tone="warning" title="Availability unavailable">
                        <p>{availabilityError.message}</p>
                      </Notice>
                    ) : nextSlots.length === 0 ? (
                      <Notice tone="muted" title="No free slots on this date">
                        <p>Try another date — this consultant&apos;s clinic is often fully booked a week ahead.</p>
                      </Notice>
                    ) : (
                      <>
                        <p className="text-sm text-muted">
                          {availability.slots.length} slots on {availability.date}
                        </p>
                        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {nextSlots.map((slot) => (
                            <li key={slot.id}>
                              <ButtonLink
                                href={`/appointments?doctorId=${doctor.id}&date=${availability.date}&slotId=${slot.id}`}
                                variant="secondary"
                                size="sm"
                                className="w-full"
                              >
                                {slot.startTime}
                              </ButtonLink>
                            </li>
                          ))}
                        </ul>
                        {nextSlots.length < availability.slots.length ? (
                          <p className="mt-3 text-xs text-muted">
                            Showing the first {nextSlots.length} of {availability.slots.length} free slots.
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                </Card>
              </PageSection>

              <PageSection title="What to expect at your first visit">
                <Card className="p-6">
                  <ol className="space-y-4">
                    {[
                      { icon: 'clipboard', title: 'Arrive 15 minutes early', body: 'Reception confirms your details and records your presenting complaint before you are called.' },
                      { icon: 'stethoscope', title: 'Consultation', body: `${doctor.slotDurationMinutes} minutes with ${doctor.name}, including history, examination and discussion of your concerns.` },
                      { icon: 'flask', title: 'Investigations if needed', body: 'Any bloods, imaging or procedures are ordered by your consultant and itemised on your invoice.' },
                      { icon: 'file', title: 'Plan and prescriptions', body: 'You leave with a written plan; prescriptions and referrals appear in your portal the same day.' },
                    ].map((step, index) => (
                      <li key={step.title} className="flex gap-3.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-ink">{step.title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-muted">{step.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Card>
              </PageSection>
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-ink">Consultation details</h2>
                <dl className="mt-3.5 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Fee</dt>
                    <dd className="font-semibold text-ink tabular-nums">{formatCurrency(doctor.consultationFee)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Duration</dt>
                    <dd className="font-medium text-ink">{doctor.slotDurationMinutes} min</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Clinic</dt>
                    <dd className="font-medium text-ink">{doctor.specialization}</dd>
                  </div>
                </dl>
                <p className="mt-4 rounded-lg border border-primary-100 bg-primary-50 p-3 text-xs leading-relaxed text-primary-900">
                  Investigations, imaging, procedures and medicines are charged separately and itemised on your invoice.
                </p>
                <ButtonLink href={`/appointments?doctorId=${doctor.id}`} variant="primary" size="lg" className="mt-4 w-full">
                  Book this doctor
                </ButtonLink>
              </Card>

              <Card className="p-5">
                <h2 className="text-sm font-semibold text-ink">Prefer a video review?</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Follow-ups can be booked as a telemedicine review. The clinic confirms the channel and sends your
                  secure link.
                </p>
                <ButtonLink
                  href={`/appointments?doctorId=${doctor.id}&type=FOLLOW_UP`}
                  variant="soft"
                  size="sm"
                  className="mt-4 w-full"
                >
                  <IconVideo className="size-4" />
                  Book a review
                </ButtonLink>
              </Card>

              <Card className="p-5">
                <h2 className="text-sm font-semibold text-ink">Before you arrive</h2>
                <ul className="mt-3 space-y-2.5 text-sm text-muted">
                  {[
                    'Bring a current list of your medicines.',
                    'Bring previous results or discharge letters.',
                    'Arrive 15 minutes early to complete registration.',
                    'Come back another day if this is an emergency.',
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <IconCheck className="mt-0.5 size-4 shrink-0 text-success-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>
          </div>
        )}
      </PageBody>

      <CtaStrip
        title={`Book ${doctor?.name?.split(' ')[0] || 'this doctor'}`}
        description="Choose the consultation type, then pick the first free slot that suits you."
        primary={
          <ButtonLink
            href={doctor ? `/appointments?doctorId=${doctor.id}` : '/appointments'}
            variant="primary"
            size="lg"
            className="bg-white text-primary-700 hover:bg-primary-50"
          >
            Start booking
            <IconArrowRight className="size-4" />
          </ButtonLink>
        }
        secondary={
          <ButtonLink href="/doctors" variant="outlineDark" size="lg">
            Compare doctors
          </ButtonLink>
        }
      />
    </>
  );
}
