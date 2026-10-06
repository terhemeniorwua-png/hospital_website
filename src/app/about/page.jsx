import { notFound } from 'next/navigation';
import Image from 'next/image';
import { PageHeader, PageBody, PageSection, CtaStrip } from '../../components/layout/PageShell';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ICONS } from '../../components/ui/IconMap';
import { departments, facilities, gallery, hospital, whyChooseUs } from '../../content/hospital';

export const metadata = {
  title: 'About the hospital',
  description:
    'St. Aurelia Teaching Hospital is a 320-bed teaching hospital in Lagos providing specialist outpatient care, diagnostics, pharmacy, inpatient services and 24-hour emergency medicine since 1974.',
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About us"
        title="A teaching hospital that publishes its prices"
        description={`${hospital.name} has provided care to Lagos since ${hospital.established}. We are a ${hospital.beds}-bed teaching hospital: residents and medical students train on our patients under consultant supervision.`}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
        actions={
          <ButtonLink href="/contact" variant="primary" size="lg">
            Contact the hospital
          </ButtonLink>
        }
      />

      {/* Story */}
      <PageBody>
        <PageSection>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
            <div className="sa-prose-body text-base text-ink/80">
              {hospital.about.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <aside className="space-y-4">
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-ink">Accreditations</h3>
                <ul className="mt-3 space-y-3">
                  {hospital.accreditations.map((item) => (
                    <li key={item.name} className="flex gap-2.5 text-sm">
                      <ICONS.award className="mt-0.5 size-4 shrink-0 text-success-600" />
                      <span>
                        <span className="font-medium text-ink">{item.name}</span>
                        <span className="mt-0.5 block text-xs text-muted">{item.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-ink">Teaching affiliations</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  {hospital.teachingAffiliations.map((name) => (
                    <li key={name} className="flex gap-2.5">
                      <ICONS.users className="mt-0.5 size-4 shrink-0 text-primary-600" />
                      {name}
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>
          </div>
        </PageSection>

        <PageSection title="Mission, vision and values" description={hospital.mission}>
          <Card className="p-6 sm:p-8">
            <p className="text-lg leading-relaxed font-medium text-ink">{hospital.mission}</p>
            <p className="mt-4 text-base leading-relaxed text-muted">{hospital.vision}</p>
            <ul className="mt-7 grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
              {hospital.values.map((value) => (
                <li key={value.title} className="flex gap-3">
                  <ICONS.check className="mt-1 size-4.5 shrink-0 text-success-600" />
                  <div>
                    <p className="text-sm font-semibold text-ink">{value.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{value.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </PageSection>

        <PageSection title="Departments" description="Eight clinical departments sharing one patient record.">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {departments.map((department) => {
              const Icon = ICONS[department.icon] || ICONS.building;
              return (
                <li key={department.slug}>
                  <Card interactive className="h-full p-5">
                    <span className="grid size-10 place-items-center rounded-lg bg-teal-50 text-teal-700">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-3.5 text-sm font-semibold text-ink">{department.name}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">{department.blurb}</p>
                    <p className="mt-3 text-xs font-medium text-muted">{department.location}</p>
                  </Card>
                </li>
              );
            })}
          </ul>
        </PageSection>

        <PageSection title="Facilities" description="What the building actually contains.">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((facility) => (
              <li key={facility.title}>
                <Card className="h-full p-5">
                  <p className="text-base font-semibold text-ink">{facility.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{facility.description}</p>
                </Card>
              </li>
            ))}
          </ul>
        </PageSection>

        <PageSection title="How we work" description="Four commitments we hold ourselves to.">
          <ul className="grid gap-5 sm:grid-cols-2">
            {whyChooseUs.map((item) => {
              const Icon = ICONS[item.icon] || ICONS.shield;
              return (
                <li key={item.title}>
                  <Card className="flex h-full gap-4 p-5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
                      <Icon className="size-5.5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </PageSection>

        <PageSection id="gallery" title="Inside the hospital">
          <ul className="grid auto-rows-[180px] grid-cols-2 gap-4 sm:auto-rows-[220px] lg:grid-cols-4">
            {gallery.map((photo, index) => (
              <li
                key={photo.src}
                className={
                  index === 0
                    ? 'col-span-2 row-span-2'
                    : index === 5
                      ? 'col-span-2'
                      : index === 7
                        ? 'col-span-2'
                        : ''
                }
              >
                <figure className="group relative h-full overflow-hidden rounded-xl">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent p-4 pt-10 text-sm font-semibold text-white">
                    {photo.caption}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </PageSection>
      </PageBody>

      <CtaStrip
        title="Come and see us"
        description="Outpatient clinics run Monday to Friday, 8:00–16:00. The emergency department never closes."
        primary={
          <ButtonLink href="/appointments" variant="primary" size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
            Book an appointment
          </ButtonLink>
        }
        secondary={
          <ButtonLink href="/emergency" variant="outlineDark" size="lg">
            Emergency care
          </ButtonLink>
        }
      />
    </>
  );
}
