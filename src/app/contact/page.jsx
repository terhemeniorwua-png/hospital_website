import Image from 'next/image';
import { PageHeader, PageBody, PageSection, CtaStrip } from '../../components/layout/PageShell';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card, DataTile } from '../../components/ui/Card';
import { ICONS } from '../../components/ui/IconMap';
import { config } from '../../lib/config';
import ContactForm from '../../components/contact/ContactForm';
import { departments } from '../../content/hospital';

export const metadata = {
  title: 'Contact & appointments',
  description: 'Find the hospital, call the switchboard, or use the emergency line. Clinic hours, departments and how to reach us.',
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Getting in touch"
        description="Call the switchboard for appointments and general enquiries, or walk in. For anything urgent, use the emergency line — it is answered around the clock."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
        actions={
          <>
            <ButtonLink href="/appointments" variant="primary" size="lg">
              Book online
            </ButtonLink>
            <ButtonLink href="/emergency" variant="emergency" size="lg">
              Emergency care
            </ButtonLink>
          </>
        }
      />

      <PageBody>
        {/* Contact methods */}
        <PageSection>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ContactCard
              icon="phone"
              label="Switchboard"
              value={config.hospital.phone}
              href={`tel:${config.hospital.phone.replace(/\s/g, '')}`}
              detail="Mon–Fri, 8:00–17:00"
            />
            <ContactCard
              icon="ambulance"
              label="Emergency line"
              value={config.hospital.emergencyPhone}
              href={`tel:${config.hospital.emergencyPhone.replace(/\s/g, '')}`}
              detail="Answered 24 hours"
              tone="danger"
            />
            <ContactCard
              icon="mail"
              label="Email"
              value={config.hospital.email}
              href={`mailto:${config.hospital.email}`}
              detail="Replies within two working days"
            />
            <ContactCard icon="mapPin" label="Address" value={config.hospital.address} detail="West entrance for emergencies" />
          </ul>
        </PageSection>

        <PageSection title="How to find us" description="Main entrance on the Victoria Island waterfront; the emergency department is on the ground floor of the West wing.">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card className="overflow-hidden p-0">
              {/* Static map placeholder — no third-party embed, no tracking. */}
              <div className="relative aspect-16/10 w-full bg-canvas">
                <Image
                  src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1400&q=80"
                  alt="Aerial view of the hospital district on the waterfront"
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-sm font-semibold">{config.hospital.name}</p>
                  <p className="mt-0.5 text-xs text-white/80">{config.hospital.address}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-ink">Clinic hours</h3>
              <dl className="mt-4 divide-y divide-line">
                {[
                  ['Monday – Friday', '8:00 – 16:00'],
                  ['Saturday', '9:00 – 13:00 (pharmacy only)'],
                  ['Sunday', 'Closed (pharmacy 9:00–12:00)'],
                  ['Public holidays', 'Emergency only'],
                ].map(([day, time]) => (
                  <div key={day} className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-sm text-muted">{day}</dt>
                    <dd className="text-sm font-medium text-ink">{time}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 rounded-lg border border-danger-100 bg-danger-50 p-4">
                <p className="text-sm font-semibold text-danger-700">Emergency department</p>
                <p className="mt-1 text-sm text-danger-700/85">Open 24 hours, every day of the year. No appointment needed.</p>
              </div>
            </Card>
          </div>
        </PageSection>

        <PageSection title="Departments and locations">
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {departments.map((department) => (
                <li key={department.slug} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
                      <DepartmentIcon name={department.icon} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{department.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{department.location}</p>
                    </div>
                  </div>
                  <ButtonLink href={`/departments#${department.slug}`} variant="ghost" size="sm">
                    View department
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </Card>
        </PageSection>

        <PageSection title="Send us a message" description="For non-urgent questions only. If this is a medical emergency, call the emergency line instead.">
          <ContactForm />
        </PageSection>
      </PageBody>

      <CtaStrip
        title="Need to see a clinician?"
        description="Book a named consultant online, at a time that suits you."
        primary={
          <ButtonLink href="/appointments" variant="primary" size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
            Book an appointment
          </ButtonLink>
        }
        secondary={
          <ButtonLink href="/messages" variant="outlineDark" size="lg">
            Message my care team
          </ButtonLink>
        }
      />
    </>
  );
}

function DepartmentIcon({ name }) {
  const Icon = ICONS[name] || ICONS.building;
  return <Icon className="size-5" />;
}

function ContactCard({ icon, label, value, href, detail, tone = 'primary' }) {
  const Icon = ICONS[icon] || ICONS.info;
  const tones = {
    primary: 'bg-primary-50 text-primary-700',
    danger: 'bg-danger-50 text-danger-700',
  };
  const content = (
    <Card interactive className="h-full p-5">
      <span className={`grid size-10 place-items-center rounded-lg ${tones[tone]}`}>
        <Icon className="size-5" />
      </span>
      <p className="mt-3.5 text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink break-words">{value}</p>
      {detail ? <p className="mt-1.5 text-xs text-muted">{detail}</p> : null}
    </Card>
  );
  const wrapped = href ? <a href={href} className="block h-full">{content}</a> : content;
  return <li className="h-full">{wrapped}</li>;
}
