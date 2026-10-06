import Image from 'next/image';
import { PageHeader, PageBody, CtaStrip } from '../../components/layout/PageShell';
import { ButtonLink } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { ICONS } from '../../components/ui/IconMap';
import { config } from '../../lib/config';
import RegisterForm from '../../components/auth/RegisterForm';

export const metadata = {
  title: 'Create an account',
  description:
    'Register for a St. Aurelia patient account to book appointments, view results and prescriptions, and message your care team.',
};

export default function RegisterPage() {
  return (
    <>
      <PageHeader
        eyebrow="Patient account"
        title="Create your account"
        description="One account gives you live appointment booking, your results and prescriptions, and a direct line to your care team."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Create an account' }]}
      />

      <PageBody>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <RegisterForm />

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="overflow-hidden p-0">
              <div className="relative aspect-4/3 w-full bg-canvas">
                <Image
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1000&q=80"
                  alt="A doctor checking a patient's chart at a clinic desk"
                  fill
                  sizes="(max-width: 1024px) 100vw, 30vw"
                  className="object-cover"
                />
              </div>
              <CardBody>
                <h2 className="text-base font-semibold text-ink">What an account gives you</h2>
                <ul className="mt-3 space-y-2.5 text-sm text-muted">
                  {[
                    'Book and manage appointments with any consultant',
                    'See lab results and prescriptions as soon as they are ready',
                    'Read your medical records, timeline and visit summaries',
                    'Message your care team securely',
                    'Track invoices and pay at the clinic',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <ICONS.check className="mt-0.5 size-4 shrink-0 text-success-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="text-sm text-muted">
                <p className="font-semibold text-ink">Your data</p>
                <p className="mt-1.5 leading-relaxed">
                  Records are private to you and the clinicians treating you. We never share or sell patient data, and
                  access by staff is logged.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="text-sm text-muted">
                <p className="font-semibold text-ink">Prefer to register in person?</p>
                <p className="mt-1.5 leading-relaxed">
                  Bring a photo ID and your details to the registration desk in the main lobby. We will create the
                  account for you and issue your hospital number.
                </p>
                <p className="mt-3">
                  <a href={`tel:${config.hospital.phone.replace(/\s/g, '')}`} className="font-semibold text-primary-700 hover:underline">
                    {config.hospital.phone}
                  </a>
                </p>
              </CardBody>
            </Card>
          </aside>
        </div>
      </PageBody>

      <CtaStrip
        title="Need care right now?"
        description="The emergency department is open 24 hours and never needs an appointment."
        primary={
          <ButtonLink href="/emergency" variant="emergency" size="lg" className="bg-white text-danger-700 hover:bg-danger-50">
            Emergency care
          </ButtonLink>
        }
        secondary={
          <ButtonLink href="/doctors" variant="outlineDark" size="lg">
            Browse our doctors
          </ButtonLink>
        }
      />
    </>
  );
}