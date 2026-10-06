'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Form';
import { IconLock, IconStethoscope } from '../ui/Icon';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';

/**
 * Sign-in modal.
 *
 * Opened by any "sign in" affordance in the product (adding to the pharmacy
 * basket, saving an appointment) so the visitor never loses their place. Full
 * page equivalents live at /login and /register.
 */
export default function AuthModal() {
  const { authModalOpen, authModalReason, closeAuthModal, signIn } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const user = await signIn({ email: form.email.trim(), password: form.password });
      toast.success('Welcome back', `Signed in as ${user.firstName || user.email}.`);
      closeAuthModal();
      if (authModalReason?.returnTo) router.push(authModalReason.returnTo);
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={authModalOpen}
      onClose={closeAuthModal}
      size="sm"
      title="Sign in to your account"
      description={authModalReason?.message || 'Access your appointments, records, results and prescriptions.'}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          leading={<IconLock className="size-4" />}
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          hint="Your password is sent only to the hospital API over HTTPS."
        />

        {error ? (
          <p role="alert" className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-sm text-danger-700">
            {error.message}
          </p>
        ) : null}

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(event) => setForm((current) => ({ ...current, remember: event.target.checked }))}
              className="size-4 rounded border-line accent-primary-600"
            />
            Keep me signed in
          </label>
          <Link href="/forgot-password" className="font-semibold text-primary-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" loading={pending} className="w-full">
          Sign in
        </Button>

        <p className="text-center text-sm text-muted">
          New to {''}
          <span className="inline-flex items-center gap-1 font-semibold text-primary-700">
            <IconStethoscope className="size-3.5" />
            St. Aurelia?
          </span>{' '}
          <Link href="/register" className="font-semibold text-primary-700 hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </Modal>
  );
}
