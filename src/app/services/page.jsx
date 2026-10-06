import { PageHeader, PageBody, PageSection, CtaStrip } from '../../components/layout/PageShell';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ICONS } from '../../components/ui/IconMap';
import { departments, services, telemedicine } from '../../content/hospital';

export const metadata = {
  title: 'Services',
  description:
    'Specialist consultations, telemedicine reviews, diagnostics, imaging, pharmacy, nursing care, inpatient admissions and 24-hour emergency care at St. Aurelia Teaching Hospital.',
};

const SERVICE_DETAIL = {
  'Specialist consultations': {
    body: 'Eight departments run consultant-led clinics. You book a named doctor and see that doctor, and residents who work under them are always clearly identified in your notes.',
    points: ['Named consultant, published consultation fee', 'Supervised residents and students', 'Structured follow-up for chronic disease'],
  },
  'Telemedicine reviews': {
    body: telemedicine.description,
    points: telemedicine.points,
  },
  'Diagnostics & laboratory': {
    body: 'Haematology, clinical chemistry, microbiology, serology, histopathology and a 24-hour blood bank. Routine results target four hours; critical results are phoned through immediately.',
    points: ['Routine bloods within 4 hours', 'Critical results phoned to the clinician', 'Results published to your portal when signed off'],
  },
  Imaging: {
    body: 'Digital radiography, obstetric ultrasound, CT, MRI and mammography, all reported by consultant radiologists. Reports appear in your portal as soon as they are signed.',
    points: ['Digital radiography and fluoroscopy', 'CT, MRI and mammography', 'Consultant radiology reporting'],
  },
  Pharmacy: {
    body: 'Our hospital pharmacy dispenses every prescription after pharmacist verification against your record, and sells a published catalogue of over a hundred generic preparations.',
    points: ['Pharmacist verification on every prescription', 'Published retail pricing', 'Chronic refills and counselling'],
  },
  'Nursing & wound care': {
    body: 'Dressings, injections, vital signs monitoring and scheduled clinical administrations performed by trained nursing staff in the ward or outpatient area.',
    points: ['Wound dressing and care', 'Injections and immunisation', 'Vital signs and administration records'],
  },
  'Inpatient admission': {
    body: '320 inpatient beds across general and surgical wards, a 24-bed critical care unit and a dedicated isolation ward, with consultant ward rounds every morning.',
    points: ['Elective and emergency admission', 'Daily consultant ward rounds', 'Critical care and isolation capability'],
  },
  'Emergency & ambulance': {
    body: 'Open 24 hours with a five-tier triage system, a dedicated resuscitation bay and an emergency physician team on site at all times.',
    points: ['Five-tier triage on arrival', 'Resuscitation bay', 'Ambulance transfer when needed'],
  },
};

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Everything the hospital does"
        description="From a first consultation through diagnostics, pharmacy and follow-up, to admission and emergency care. Each service below is delivered in-house by the teams on our wards."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Services' }]}
        actions={
          <ButtonLink href="/appointments" variant="primary" size="lg">
            Book an appointment
          </ButtonLink>
        }
      />

      <PageBody>
        <PageSection>
          <ul className="grid gap-5 sm:grid-cols-2">
            {services.map((service) => {
              const Icon = ICONS[service.icon] || ICONS.stethoscope;
              const detail = SERVICE_DETAIL[service.title];
              return (
                <li key={service.title} id={service.title.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}>
                  <Card className="h-full p-6">
                    <div className="flex items-start gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
                        <Icon className="size-6" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-ink">{service.title}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted">{detail?.body || service.description}</p>
                      </div>
                    </div>
                    {detail?.points ? (
                      <ul className="mt-4 space-y-2 border-t border-line pt-4">
                        {detail.points.map((point) => (
                          <li key={point} className="flex gap-2.5 text-sm text-ink/80">
                            <ICONS.check className="mt-0.5 size-4 shrink-0 text-success-600" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        </PageSection>

        <PageSection
          id="telemedicine"
          title="Telemedicine reviews"
          description="Care that does not need a waiting room. Booked through the same step-by-step flow as any other appointment."
        >
          <Card className="grid gap-6 p-6 sm:p-8 lg:grid-cols-2">
            <div>
              <p className="text-base leading-relaxed text-muted">{telemedicine.description}</p>
              <p className="mt-4 rounded-lg border border-primary-100 bg-primary-50 p-4 text-sm text-primary-900">
                {telemedicine.note}
              </p>
              <ButtonLink href="/appointments?type=FOLLOW_UP" variant="primary" size="lg" className="mt-6">
                Book a review
              </ButtonLink>
            </div>
            <ul className="space-y-3">
              {telemedicine.points.map((point) => (
                <li key={point} className="flex gap-3 rounded-lg border border-line bg-canvas p-4 text-sm leading-relaxed text-ink">
                  <ICONS.video className="mt-0.5 size-4.5 shrink-0 text-primary-700" />
                  {point}
                </li>
              ))}
            </ul>
          </Card>
        </PageSection>

        <PageSection title="Which department should I see?" description="If you are not sure, book general medicine and we will refer you internally at no extra cost.">
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {departments.map((department) => {
                const Icon = ICONS[department.icon] || ICONS.building;
                return (
                  <li key={department.slug} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{department.name}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">{department.specialties.join(' · ')}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <ButtonLink href="/departments" variant="ghost" size="sm">
                        About
                      </ButtonLink>
                      <ButtonLink href={`/appointments?department=${encodeURIComponent(department.name)}`} variant="soft" size="sm">
                        Book
                      </ButtonLink>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </PageSection>
      </PageBody>

      <CtaStrip
        title="Book the service you need"
        description="Pick a department, choose a named consultant and take the first free slot."
        primary={
          <ButtonLink href="/appointments" variant="primary" size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
            Book an appointment
          </ButtonLink>
        }
        secondary={
          <ButtonLink href="/doctors" variant="outlineDark" size="lg">
            Find a doctor
          </ButtonLink>
        }
      />
    </>
  );
}
