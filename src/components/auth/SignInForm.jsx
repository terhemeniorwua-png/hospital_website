'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../ui/Button';
import { Input } from '../ui/Form';
import { ICONS } from '../ui/IconMap';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';

/**
 * Full-page sign in.
 *
 * The compact modal version lives in components/layout/AuthModal.jsx; both call
 * the same `signIn` from AuthProvider so redirects, socket teardown and toasts
 * behave identically however a session starts.
 */
export default function SignInForm() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const user = await signIn({ email: form.email.trim(), password: form.password });
      toast.success('Welcome back', `Signed in as ${user.firstName || user.email}.`);
      router.push(returnTo);
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
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
        leading={<ICONS.lock className="size-4" />}
        value={form.password}
        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
      />

      {error ? (
        <p role="alert" className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-sm text-danger-700">
          {error.message}
        </p>
      ) : null}

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="font-semibold text-primary-700 hover:underline">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" variant="primary" size="lg" loading={pending} className="w-full">
        Sign in
      </Button>
    </form>
  );
}