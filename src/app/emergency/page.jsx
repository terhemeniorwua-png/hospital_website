import Image from 'next/image';
import { PageHeader, PageBody, PageSection, CtaStrip } from '../../components/layout/PageShell';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ICONS } from '../../components/ui/IconMap';
import { config } from '../../lib/config';
import { emergencyGuide } from '../../content/hospital';

export const metadata = {
  title: 'Emergency care',
  description:
    'Our emergency department is open 24 hours. Warning signs that need immediate care, what to bring, and how triage works at St. Aurelia Teaching Hospital.',
};

/* Icon colours are static strings so Tailwind can see them at build time. */
const TRIAGE_LEVELS = [
  { level: 1, label: 'Resuscitation', detail: 'Life-threatening. Seen immediately in the resuscitation bay.', iconClass: 'text-danger-600', barClass: 'bg-danger-500' },
  { level: 2, label: 'Very urgent', detail: 'Seen within about 10 minutes.', iconClass: 'text-danger-600', barClass: 'bg-danger-500' },
  { level: 3, label: 'Urgent', detail: 'Seen within about 30 minutes.', iconClass: 'text-warning-600', barClass: 'bg-warning-500' },
  { level: 4, label: 'Standard', detail: 'Seen within about 60 minutes.', iconClass: 'text-primary-600', barClass: 'bg-primary-500' },
  { level: 5, label: 'Fast track', detail: 'Minor illness and injury, streamed to a separate lane.', iconClass: 'text-success-600', barClass: 'bg-success-500' },
];

export default function EmergencyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Emergency"
        title="Emergency care, open 24 hours"
        description="If you or someone with you has a medical emergency, come to the West entrance or call the emergency line now. Do not wait for an appointment, and do not drive yourself if you feel faint or confused."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Emergency' }]}
        actions={
          <>
            <a
              href={`tel:${config.hospital.emergencyPhone.replace(/\s/g, '')}`}
              className="inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-danger-600 px-7 text-base font-bold text-white shadow-soft transition hover:bg-danger-700"
            >
              <ICONS.phone className="size-5" />
              Call {config.hospital.emergencyPhone}
            </a>
            <ButtonLink href="/contact" variant="secondary" size="lg">
              Directions
            </ButtonLink>
          </>
        }
      />

      <PageBody>
        <PageSection>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            {/* Red flags */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Go now if you have any of these</h2>
              <p className="mt-2.5 text-base text-muted">
                We would rather see you unnecessarily than late. If you are unsure, call the emergency line and speak to
                a nurse.
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {emergencyGuide.redFlags.map((flag) => (
                  <li key={flag.title}>
                    <Card className="flex h-full gap-3 border-danger-100 bg-danger-50 p-4">
                      <ICONS.ambulance className="mt-0.5 size-5 shrink-0 text-danger-600" />
                      <div>
                        <p className="text-sm font-semibold text-danger-700">{flag.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-danger-700/85">{flag.description}</p>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>

            {/* Arrival info */}
            <aside className="space-y-4">
              <Card className="overflow-hidden p-0">
                <div className="relative aspect-4/3">
                  <Image
                    src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=900&q=80"
                    alt="Emergency department entrance with an ambulance bay"
                    fill
                    sizes="(max-width: 1024px) 100vw, 22rem"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                  <p className="absolute inset-x-0 bottom-0 p-4 text-sm font-semibold text-white">
                    West entrance · ground floor
                  </p>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-base font-semibold text-ink">What to bring</h3>
                <ul className="mt-3 space-y-2.5 text-sm text-muted">
                  {emergencyGuide.onArrival.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <ICONS.check className="mt-0.5 size-4 shrink-0 text-success-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="border-primary-100 bg-primary-50 p-5">
                <h3 className="text-sm font-semibold text-primary-900">Address</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-primary-900/80">
                  {config.hospital.address}
                  <br />
                  Emergency department: West entrance, ground floor
                </p>
              </Card>
            </aside>
          </div>
        </PageSection>

        <PageSection
          title="How triage works"
          description="A triage nurse assesses every patient on arrival and assigns a priority from one to five. Critical patients are moved straight to resuscitation; minor cases are streamed to a fast track so the waiting room keeps moving."
        >
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {TRIAGE_LEVELS.map((triage) => (
              <li key={triage.level}>
                <Card className="h-full p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl font-bold text-ink tabular-nums">{triage.level}</span>
                    <ICONS.activity className={`size-5 ${triage.iconClass}`} />
                  </div>
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-line">
                    <div className={`h-full ${triage.barClass}`} style={{ width: `${100 / triage.level}%` }} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink">{triage.label}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{triage.detail}</p>
                </Card>
              </li>
            ))}
          </ol>
        </PageSection>

        <PageSection title="What happens after you are seen">
          <Card className="p-6 sm:p-8">
            <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: 'clipboard', title: 'Assessment and observations', body: 'A physician examines you and records vital signs, history and examination findings.' },
                { icon: 'flask', title: 'Investigations', body: 'Bloods, ECG, imaging or other tests are ordered and, where possible, performed before you leave the department.' },
                { icon: 'wallet', title: 'Treatment and disposition', body: 'You are treated, then either discharged home with instructions, admitted to a ward, or transferred.' },
                { icon: 'chat', title: 'Follow-up', body: 'Discharge instructions and any follow-up appointment appear in your portal the same day.' },
              ].map((step, index) => {
                const Icon = ICONS[step.icon];
                return (
                  <li key={step.title}>
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-600 text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
                    </div>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted">{step.body}</p>
                  </li>
                );
              })}
            </ol>
            <p className="mt-7 rounded-lg border border-primary-100 bg-primary-50 p-4 text-sm leading-relaxed text-primary-900">
              For anything that is not an emergency, book a clinic appointment instead — it will usually be seen
              sooner than a walk-in, and you can choose the consultant.
            </p>
            <ButtonLink href="/appointments" variant="primary" size="lg" className="mt-6">
              Book a clinic appointment
            </ButtonLink>
          </Card>
        </PageSection>
      </PageBody>

      <CtaStrip
        title="Suspect an emergency right now?"
        description="Call the emergency line. A nurse will talk you through what to do on the way in."
        primary={
          <a
            href={`tel:${config.hospital.emergencyPhone.replace(/\s/g, '')}`}
            className="inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-white px-7 text-base font-bold text-danger-700 transition hover:bg-danger-50"
          >
            <ICONS.phone className="size-5" />
            {config.hospital.emergencyPhone}
          </a>
        }
        secondary={
          <ButtonLink href="/contact" variant="outlineDark" size="lg">
            Directions &amp; parking
          </ButtonLink>
        }
      />
    </>
  );
}
