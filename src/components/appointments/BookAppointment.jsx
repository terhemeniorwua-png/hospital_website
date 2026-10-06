'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, PageBody, PageSection, CtaStrip } from '../layout/PageShell';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button, ButtonLink } from '../ui/Button';
import { Select, Textarea, RadioCard } from '../ui/Form';
import { Badge, StatusBadge, Avatar } from '../ui/Badge';
import { EmptyState, ErrorState, Notice, GridSkeleton } from '../ui/States';
import { ICONS } from '../ui/IconMap';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';
import { formatCurrency, formatDate, formatTime } from '../../lib/utils';
import {
  APPOINTMENT_TYPES,
  bookAppointment,
  getAvailability,
  listAvailableDoctors,
  resolveDoctorDepartments,
} from '../../lib/services/appointments';
import { config } from '../../lib/config';

/**
 * Appointment booking.
 *
 * The flow mirrors the backend's real booking contract rather than an idealised
 * one: a doctor must be chosen first, because `GET /appointments/availability`
 * is keyed on doctor + date and the slot grid is generated per doctor. Each step
 * narrows the next one, and every slot shown is one the backend reports as
 * genuinely bookable.
 */

const STEPS = [
  { key: 'doctor', label: 'Choose a doctor' },
  { key: 'date', label: 'Pick a date' },
  { key: 'slot', label: 'Pick a time' },
  { key: 'confirm', label: 'Confirm' },
];

const DAY_COUNT = 14;

function toDateOnly(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function buildDayOptions() {
  const days = [];
  for (let offset = 1; offset <= DAY_COUNT; offset += 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    days.push({ value: toDateOnly(date), date });
  }
  return days;
}

export default function BookAppointmentPage() {
  const { isAuthenticated, isPatient, patientId, isLoading: sessionLoading, openAuthModal } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [doctorError, setDoctorError] = useState(null);

  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [slotId, setSlotId] = useState('');
  const [type, setType] = useState('NEW');
  const [reason, setReason] = useState('');

  const [availability, setAvailability] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(null);

  const [departments, setDepartments] = useState({});
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState(null);
  const [confirmed, setConfirmed] = useState(null);

  const dayOptions = useMemo(() => buildDayOptions(), []);

  /* Load the bookable doctors once the visitor is a signed-in patient. */
  useEffect(() => {
    if (!isAuthenticated) {
      setLoadingDoctors(false);
      return;
    }

    let cancelled = false;
    setLoadingDoctors(true);
    setDoctorError(null);

    Promise.all([listAvailableDoctors({ limit: 100 }), resolveDoctorDepartments()])
      .then(([response, departmentMap]) => {
        if (cancelled) return;
        setDoctors(response.data || []);
        setDepartments(departmentMap || {});
      })
      .catch((caught) => {
        if (!cancelled) setDoctorError(caught);
      })
      .finally(() => {
        if (!cancelled) setLoadingDoctors(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  /* Load the slot grid whenever the doctor or date changes. */
  useEffect(() => {
    if (!doctorId || !date) {
      setAvailability(null);
      setSlotsError(null);
      return;
    }

    let cancelled = false;
    setLoadingSlots(true);
    setSlotsError(null);
    setSlotId('');

    getAvailability({ doctorId, date })
      .then((response) => {
        if (!cancelled) setAvailability(response.data || null);
      })
      .catch((caught) => {
        if (!cancelled) setSlotsError(caught);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [doctorId, date]);

  const doctor = useMemo(() => doctors.find((item) => String(item.id) === String(doctorId)) || null, [doctors, doctorId]);

  const slots = useMemo(() => {
    const all = availability?.slots || [];
    return {
      bookable: all.filter((slot) => slot.isAvailable),
      taken: all.filter((slot) => !slot.isAvailable),
    };
  }, [availability]);

  const selectedSlot = useMemo(
    () => (availability?.slots || []).find((slot) => String(slot.id) === String(slotId)) || null,
    [availability, slotId],
  );

  const departmentId = doctorId ? departments[doctorId] ?? null : null;
  const activeStep = confirmed ? 4 : !doctorId ? 0 : !date ? 1 : !slotId ? 2 : 3;

  function resetFromDoctor() {
    setDoctorId('');
    setDate('');
    setSlotId('');
    setConfirmed(null);
    setBookError(null);
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!doctor || !selectedSlot) return;

    setBooking(true);
    setBookError(null);

    try {
      const payload = {
        patientId,
        doctorId: doctor.id,
        departmentId,
        appointmentDate: date,
        slotId: selectedSlot.id,
        startTime: selectedSlot.startTime,
        type,
        reason: reason.trim() || undefined,
        fee: doctor.consultationFee || undefined,
      };

      const response = await bookAppointment(payload);
      const appointment = response.data;
      setConfirmed(appointment);
      toast.success('Appointment booked', `Reference ${appointment.appointmentNumber}.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setBookError(caught);
      // A slot can be taken between rendering and submitting; refresh the grid.
      if (caught?.status === 409 || caught?.status === 400) {
        getAvailability({ doctorId, date }).then((response) => setAvailability(response.data || null)).catch(() => {});
      }
    } finally {
      setBooking(false);
    }
  }

  /* ---------------- confirmation ---------------- */
  if (confirmed) {
    return (
      <>
        <PageHeader
          eyebrow="Appointments"
          title="You are booked in"
          description="A confirmation has been recorded against your account. Bring your hospital number and arrive fifteen minutes early."
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Appointments' }]}
        />
        <PageBody>
          <Card className="mx-auto max-w-2xl p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-success-50 text-success-700">
                <ICONS.check className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-ink">{confirmed.doctorName}</p>
                <p className="text-sm text-muted">{doctor?.specialization}</p>
                <StatusBadge status={confirmed.status} className="mt-2" />
              </div>
            </div>

            <dl className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
              <Summary label="Reference" value={confirmed.appointmentNumber} mono />
              <Summary label="Date" value={formatDate(confirmed.appointmentDate, 'full')} />
              <Summary label="Time" value={`${confirmed.startTime} – ${confirmed.endTime}`} />
              <Summary label="Consultation fee" value={formatCurrency(confirmed.fee)} />
              <Summary label="Appointment type" value={APPOINTMENT_TYPES.find((item) => item.value === confirmed.type)?.label || confirmed.type} />
            </dl>

            {confirmed.reason ? (
              <div className="mt-6 rounded-lg bg-canvas p-4">
                <p className="text-xs font-medium tracking-wide text-muted uppercase">What you told us</p>
                <p className="mt-1.5 text-sm text-ink">{confirmed.reason}</p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => { resetFromDoctor(); }}>
                Book another appointment
              </Button>
              <ButtonLink href="/dashboard" variant="secondary">
                Go to my dashboard
              </ButtonLink>
            </div>
          </Card>
        </PageBody>
      </>
    );
  }

  /* ---------------- signed out ---------------- */
  if (!sessionLoading && !isAuthenticated) {
    return (
      <>
        <PageHeader
          eyebrow="Appointments"
          title="Book an appointment"
          description="Sign in or create an account to see live availability and reserve a slot."
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Appointments' }]}
        />
        <PageBody>
          <Card className="mx-auto max-w-xl p-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-50 text-primary-700">
              <ICONS.calendar className="size-7" />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-ink">Sign in to book</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Availability is checked against live clinic schedules, so we ask you to sign in first. It also keeps your
              bookings in one place.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                variant="primary"
                onClick={() => openAuthModal({ message: 'Sign in to book an appointment.', returnTo: '/appointments' })}
              >
                Sign in
              </Button>
              <ButtonLink href="/register" variant="secondary">
                Create an account
              </ButtonLink>
            </div>
          </Card>
        </PageBody>
      </>
    );
  }

  /* ---------------- booking wizard ---------------- */
  return (
    <>
      <PageHeader
        eyebrow="Appointments"
        title="Book an appointment"
        description="Four short steps. Availability comes straight from each consultant's live clinic schedule, so a slot only appears while it is genuinely free."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Appointments' }]}
        actions={
          <ButtonLink href="/doctors" variant="secondary" size="lg">
            Browse doctors first
          </ButtonLink>
        }
      />

      <PageBody>
        <ol className="mb-8 grid gap-3 sm:grid-cols-4">
          {STEPS.map((step, index) => {
            const state = index < activeStep ? 'done' : index === activeStep ? 'current' : 'todo';
            return (
              <li
                key={step.key}
                aria-current={state === 'current' ? 'step' : undefined}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  state === 'todo' ? 'border-line bg-white' : 'border-primary-200 bg-primary-50'
                }`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                    state === 'done' ? 'bg-primary-600 text-white' : state === 'current' ? 'bg-primary-600 text-white' : 'bg-canvas text-muted'
                  }`}
                >
                  {state === 'done' ? <ICONS.check className="size-4" /> : index + 1}
                </span>
                <span className={`text-sm font-medium ${state === 'todo' ? 'text-muted' : 'text-ink'}`}>{step.label}</span>
              </li>
            );
          })}
        </ol>

        {isAuthenticated && !isPatient ? (
          <Notice tone="warning" title="Staff account" className="mb-6">
            You are signed in with a staff account. Booking here books an appointment for your own patient record; use the
            reception workflow to book on behalf of another patient.
          </Notice>
        ) : null}

        {doctorError ? (
          <ErrorState
            title="Could not load the doctor list"
            description={doctorError.message}
            onRetry={() => window.location.reload()}
            className="mb-6"
          />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            {/* Step 1 — doctor */}
            <Card>
              <CardHeader
                title="1. Choose a doctor"
                description="Only consultants currently accepting new bookings are listed."
                icon={<ICONS.stethoscope className="size-4" />}
              />
              <CardBody className="space-y-4">
                {loadingDoctors ? (
                  <GridSkeleton count={4} />
                ) : doctors.length ? (
                  <>
                    <Select
                      label="Doctor"
                      placeholder="Select a consultant"
                      value={doctorId}
                      onChange={(event) => {
                        setDoctorId(event.target.value);
                        setDate('');
                        setSlotId('');
                      }}
                      options={doctors.map((item) => ({
                        value: String(item.id),
                        label: `${item.name} — ${item.specialization}${item.isOnDuty ? ' (on duty)' : ''}`,
                      }))}
                      hint="Change the doctor to reset the date and time."
                    />

                    <ul className="grid gap-3 sm:grid-cols-2">
                      {doctors.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setDoctorId(String(item.id));
                              setDate('');
                              setSlotId('');
                            }}
                            className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition ${
                              String(item.id) === doctorId
                                ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/30'
                                : 'border-line bg-white hover:border-primary-300'
                            }`}
                            aria-pressed={String(item.id) === doctorId}
                          >
                            <Avatar name={item.name} firstName={item.user?.firstName} lastName={item.user?.lastName} size="md" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-ink">{item.name}</span>
                              <span className="mt-0.5 block truncate text-xs text-primary-700">{item.specialization}</span>
                              <span className="mt-1.5 flex flex-wrap items-center gap-2">
                                <Badge tone="muted" size="sm">
                                  {formatCurrency(item.consultationFee)}
                                </Badge>
                                {item.isOnDuty ? (
                                  <Badge tone="success" size="sm">
                                    On duty
                                  </Badge>
                                ) : null}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <EmptyState
                    icon={<ICONS.stethoscope className="size-6" />}
                    title="No consultants are accepting bookings"
                    description="Every consultant has paused their diary. Please check back shortly or call the switchboard."
                    action={
                      <ButtonLink href="/contact" variant="secondary" size="sm">
                        Contact the hospital
                      </ButtonLink>
                    }
                  />
                )}
              </CardBody>
            </Card>

            {/* Step 2 — date */}
            <Card className={doctorId ? '' : 'opacity-60'}>
              <CardHeader
                title="2. Pick a date"
                description="We show the next two weeks of clinic days."
                icon={<ICONS.calendar className="size-4" />}
              />
              <CardBody>
                {!doctorId ? (
                  <p className="text-sm text-muted">Choose a doctor to see available dates.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dayOptions.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          setDate(day.value);
                          setSlotId('');
                        }}
                        aria-pressed={day.value === date}
                        className={`min-w-20 rounded-lg border px-3 py-2.5 text-left transition ${
                          day.value === date
                            ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/30'
                            : 'border-line bg-white hover:border-primary-300'
                        }`}
                      >
                        <span className="block text-xs text-muted">
                          {day.date.toLocaleDateString('en-GB', { weekday: 'short' })}
                        </span>
                        <span className="block text-sm font-semibold text-ink">
                          {day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Step 3 — slot */}
            <Card className={doctorId && date ? '' : 'opacity-60'}>
              <CardHeader
                title="3. Pick a time"
                description={availability?.doctor ? `${availability.doctor.name} — ${availability.doctor.slotDurationMinutes} minute slots` : 'Slots are shown in clinic time.'}
                icon={<ICONS.clock className="size-4" />}
              />
              <CardBody>
                {!doctorId || !date ? (
                  <p className="text-sm text-muted">Choose a doctor and a date to see free times.</p>
                ) : slotsError ? (
                  <ErrorState title="Could not load availability" description={slotsError.message} onRetry={() => setDate(date)} compact />
                ) : loadingSlots ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 8 }, (_, index) => (
                      <span key={index} className="h-10 w-24 animate-pulse rounded-lg bg-canvas" />
                    ))}
                  </div>
                ) : slots.bookable.length ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {slots.bookable.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSlotId(String(slot.id))}
                          aria-pressed={String(slot.id) === slotId}
                          className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                            String(slot.id) === slotId
                              ? 'border-primary-500 bg-primary-600 text-white'
                              : 'border-line bg-white text-ink hover:border-primary-300'
                          }`}
                        >
                          {formatTime(slot.startTime)}
                        </button>
                      ))}
                    </div>
                    {slots.taken.length ? (
                      <p className="mt-4 text-xs text-muted">
                        {slots.taken.length} later slot{slots.taken.length === 1 ? ' is' : 's are'} already taken and hidden.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <EmptyState
                    icon={<ICONS.calendar className="size-6" />}
                    title="No free slots on this day"
                    description="Try another date, or pick a different consultant."
                    compact
                  />
                )}
              </CardBody>
            </Card>

            {/* Step 4 — confirm */}
            <Card className={slotId ? '' : 'opacity-60'}>
              <CardHeader
                title="4. Confirm and book"
                description="Tell us what the visit is for so the consultant can prepare."
                icon={<ICONS.check className="size-4" />}
              />
              <CardBody>
                <form onSubmit={onSubmit} className="space-y-5" noValidate>
                  <fieldset disabled={!slotId}>
                    <legend className="mb-3 text-sm font-medium text-ink">Appointment type</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {APPOINTMENT_TYPES.map((option) => (
                        <RadioCard
                          key={option.value}
                          label={option.label}
                          value={option.value}
                          checked={type === option.value}
                          onChange={setType}
                        />
                      ))}
                    </div>

                    <Textarea
                      label="Reason for the visit"
                      className="mt-5"
                      rows={3}
                      maxLength={1000}
                      placeholder="Briefly describe your symptoms or what you would like reviewed."
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      hint={`${reason.length}/1000. This is visible to your care team only.`}
                    />

                    {!departmentId && doctorId ? (
                      <Notice tone="danger" title="We could not confirm the department" className="mt-4">
                        Booking needs the department this consultant works in, and we could not read it from the hospital
                        system. Please call the switchboard on {config.hospital.phone}.
                      </Notice>
                    ) : null}

                    {bookError ? (
                      <div
                        role="alert"
                        className="mt-4 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-sm text-danger-700"
                      >
                        {bookError.message}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button type="submit" variant="primary" size="lg" loading={booking} disabled={!departmentId}>
                        Confirm booking
                      </Button>
                      <span className="text-sm text-muted">
                        {selectedSlot ? `${formatDate(date, 'full')} at ${formatTime(selectedSlot.startTime)}` : 'Pick a time to continue'}
                      </span>
                    </div>
                  </fieldset>
                </form>
              </CardBody>
            </Card>
          </div>

          {/* Summary rail */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardHeader title="Your booking" description="Review before you confirm." />
              <CardBody className="space-y-3 text-sm">
                <Summary label="Patient" value={isPatient ? 'Your own record' : 'This account'} />
                <Summary label="Doctor" value={doctor?.name || 'Not chosen yet'} />
                <Summary label="Specialty" value={doctor?.specialization || '—'} />
                <Summary label="Date" value={date ? formatDate(date, 'full') : 'Not chosen yet'} />
                <Summary label="Time" value={selectedSlot ? `${formatTime(selectedSlot.startTime)} – ${formatTime(selectedSlot.endTime)}` : 'Not chosen yet'} />
                <Summary
                  label="Consultation fee"
                  value={doctor ? formatCurrency(doctor.consultationFee) : '—'}
                  hint="Payable at the clinic."
                />
              </CardBody>
            </Card>

            <Card className="mt-4">
              <CardBody className="text-sm text-muted">
                <p className="font-semibold text-ink">Need to change plans?</p>
                <p className="mt-1.5 leading-relaxed">
                  You can cancel or reschedule from your dashboard. If your symptoms become an emergency, do not wait for
                  an appointment — call the emergency line on {config.hospital.emergencyPhone}.
                </p>
                <p className="mt-3">
                  <Link href="/emergency" className="font-semibold text-primary-700 hover:underline">
                    Emergency care →
                  </Link>
                </p>
              </CardBody>
            </Card>
          </aside>
        </div>
      </PageBody>

      <CtaStrip
        title="Not sure which consultant you need?"
        description="Read what each department treats, or call the switchboard and we will point you to the right clinic."
        primary={
          <ButtonLink href="/departments" variant="primary" size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
            Browse departments
          </ButtonLink>
        }
        secondary={
          <ButtonLink href="/contact" variant="outlineDark" size="lg">
            Contact the hospital
          </ButtonLink>
        }
      />
    </>
  );
}

function Summary({ label, value, hint, mono }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
      <div>
        <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      <dd className={`text-right text-sm font-semibold text-ink ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}