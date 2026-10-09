'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../providers/AuthProvider';
import { CardSkeleton } from '../ui/States';

/**
 * Route guard for the portal.
 *
 * Nothing here decides *authorisation* - the backend does. This only prevents
 * an anonymous user from staring at an empty page, and keeps a role away from
 * screens it cannot use. Redirects carry the destination so sign-in lands back
 * where the user was heading.
 */
export default function RequireAuth({ children, roles = null }) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = !roles || !role || roles.includes(role);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">Not available</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">This screen is for another role</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Your account does not have access to this area. Head back to your dashboard to continue.
        </p>
        <a href="/dashboard" className="mt-6 inline-block rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white">
          Back to dashboard
        </a>
      </div>
    );
  }

  return children;
}
