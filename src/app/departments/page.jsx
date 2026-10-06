import { PageHeader, PageBody, PageSection, CtaStrip } from '../../components/layout/PageShell';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ICONS } from '../../components/ui/IconMap';
import { departments } from '../../content/hospital';

export const metadata = {
  title: 'Departments',
  description:
    'Internal medicine, orthopaedics, obstetrics and gynaecology, paediatrics, laboratory services, radiology and imaging, hospital pharmacy and the 24-hour emergency department.',
};

export default function DepartmentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Departments"
        title="Eight departments, one record"
        description="Each department keeps its own clinic schedule and ward team, but your notes, results, images and prescriptions are shared — so any clinician who treats you has the full picture."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Departments' }]}
        actions={
          <ButtonLink href="/doctors" variant="primary" size="lg">
            Find a doctor
          </ButtonLink>
        }
      />

      <PageBody width="full">
        <PageSection>
          <ul className="grid gap-6 lg:grid-cols-2">
            {departments.map((department) => {
              const Icon = ICONS[department.icon] || ICONS.building;
              return (
                <li key={department.slug} id={department.slug}>
                  <Card className="flex h-full flex-col p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                        <Icon className="size-6" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-xl font-semibold text-ink">{department.name}</h2>
                        <p className="mt-1 text-sm text-muted">
                          <ICONS.mapPin className="mr-1 inline size-3.5" />
                          {department.location}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-muted">{department.detail}</p>

                    <div className="mt-5">
                      <p className="text-xs font-semibold tracking-wide text-muted uppercase">Specialties</p>
                      <ul className="mt-2.5 flex flex-wrap gap-2">
                        {department.specialties.map((specialty) => (
                          <li
                            key={specialty}
                            className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink"
                          >
                            {specialty}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                      <p className="text-sm text-muted">
                        <span className="font-medium text-ink">{department.leadName}</span> · Department lead
                      </p>
                      <ButtonLink href={`/appointments?department=${encodeURIComponent(department.name)}`} variant="soft" size="sm">
                        Book in this department
                      </ButtonLink>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </PageSection>
      </PageBody>

      <CtaStrip
        title="Not sure which department?"
        description="Book general internal medicine and we will refer you internally, at no extra charge."
        primary={
          <ButtonLink href="/appointments" variant="primary" size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
            Book an appointment
          </ButtonLink>
        }
        secondary={
          <ButtonLink href="/contact" variant="outlineDark" size="lg">
            Ask us first
          </ButtonLink>
        }
      />
    </>
  );
}
