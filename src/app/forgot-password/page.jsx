'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, PageBody } from '../../components/layout/PageShell';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { IconLock, IconMailbox } from '../../components/ui/Icon';
import { Notice } from '../../components/ui/States';
import { useToast } from '../../components/providers/ToastProvider';
import { forgotPassword } from '../../lib/services/auth';

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await forgotPassword(email.trim());
      setSent(true);
      toast.success('Reset link sent', 'Check your inbox for instructions to reset your password.');
    } catch (caught) {
      setError(caught);
      toast.error('Could not send the link', caught?.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Forgot your password?"
        description="Enter the email registered with the hospital and we will send you a reset link."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Sign in', href: '/login' },
          { label: 'Reset password' },
        ]}
      />

      <PageBody>
        <div className="mx-auto max-w-xl">
          <Card>
            <CardHeader
              icon={<IconLock className="size-5" />}
              title="Request a reset link"
              description="The link expires shortly after it is sent."
            />
            <CardBody className="space-y-4">
              {sent ? (
                <>
                  <Notice tone="success" title="Check your inbox">
                    If an account exists for {email}, a reset link is on its way. It may take a minute to arrive.
                  </Notice>
                  <div className="flex flex-wrap gap-3">
                    <ButtonLink href="/login" variant="primary">
                      Back to sign in
                    </ButtonLink>
                    <Button variant="secondary" onClick={() => setSent(false)}>
                      Try another email
                    </Button>
                  </div>
                </>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-label="Email address"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  {error ? (
                    <p className="text-sm text-danger-600">
                      {error?.message || 'We could not send the reset link. Please try again.'}
                    </p>
                  ) : null}
                  <Button type="submit" loading={pending} disabled={!email.trim()} className="w-full">
                    <IconMailbox className="mr-1.5 size-4" /> Send reset link
                  </Button>
                </form>
              )}

              <p className="text-sm text-muted">
                Remembered it?{' '}
                <Link href="/login" className="font-semibold text-primary-700 hover:underline">
                  Sign in
                </Link>{' '}
                or{' '}
                <Link href="/register" className="font-semibold text-primary-700 hover:underline">
                  create an account
                </Link>
                .
              </p>
            </CardBody>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
