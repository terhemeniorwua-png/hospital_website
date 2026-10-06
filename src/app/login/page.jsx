import { PageHeader, PageBody, CtaStrip } from '../../components/layout/PageShell';
import { ButtonLink } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { ICONS } from '../../components/ui/IconMap';
import { Suspense } from 'react';
import SignInForm from '../../components/auth/SignInForm';

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to your St. Aurelia patient account to book appointments and view results.',
};

export default function LoginPage() {
  return (
    <>
      <PageHeader
        eyebrow="Patient account"
        title="Sign in"
        description="Welcome back. Sign in to book appointments and view your results, prescriptions and records."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Sign in' }]}
      />

      <PageBody>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <Card className="lg:order-2">
            <CardBody>
              <Suspense fallback={null}>
                <SignInForm />
              </Suspense>
            </CardBody>
          </Card>

          <aside className="space-y-4 lg:order-1">
            <Card>
              <CardBody>
                <h2 className="text-base font-semibold text-ink">New to St. Aurelia?</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  Creating an account takes a couple of minutes and lets you book appointments straight away.
                </p>
                <ButtonLink href="/register" variant="primary" size="lg" className="mt-4 w-full">
                  Create an account
                </ButtonLink>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <ICONS.lock className="size-4 text-primary-700" />
                  Your session
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  Signing in stores a token in this browser so you stay signed in between visits. Sign out on shared or
                  public computers.
                </p>
              </CardBody>
            </Card>
          </aside>
        </div>
      </PageBody>

      <CtaStrip
        title="Emergency?"
        description="The emergency department is open 24 hours and never needs an appointment."
        primary={
          <ButtonLink href="/emergency" variant="emergency" size="lg" className="bg-white text-danger-700 hover:bg-danger-50">
            Emergency care
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
