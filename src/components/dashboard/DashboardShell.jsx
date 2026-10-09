'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils';
import { useAuth } from '../providers/AuthProvider';
import { useRealtime } from '../providers/RealtimeProvider';
import { Avatar } from '../ui/Badge';
import { ButtonLink, IconButton } from '../ui/Button';
import {
  IconCalendar,
  IconChat,
  IconClipboard,
  IconClock,
  IconFile,
  IconFlask,
  IconGrid,
  IconLogout,
  IconMenu,
  IconPill,
  IconStethoscope,
  IconUser,
  IconUsers,
  IconWallet,
  IconX,
} from '../ui/Icon';
import NotificationsBell from './NotificationsBell';

/**
 * Portal chrome shared by every signed-in page.
 *
 * One sidebar + topbar for both roles; the nav list is derived from the role
 * returned by `GET /auth/me`, so a patient never sees a doctor-only link (and
 * vice versa) - the backend still decides what each request may return.
 */

const PATIENT_NAV = [
  { href: '/dashboard', label: 'Overview', icon: IconGrid },
  { href: '/dashboard/appointments', label: 'Appointments', icon: IconCalendar },
  { href: '/records', label: 'Medical records', icon: IconFile },
  { href: '/prescriptions', label: 'Prescriptions', icon: IconPill },
  { href: '/lab-results', label: 'Lab results', icon: IconFlask },
  { href: '/messages', label: 'Messages', icon: IconChat },
  { href: '/billing', label: 'Billing', icon: IconWallet },
  { href: '/documents', label: 'Documents', icon: IconClipboard },
  { href: '/profile', label: 'Profile', icon: IconUser },
];

const DOCTOR_NAV = [
  { href: '/dashboard', label: 'Overview', icon: IconGrid },
  { href: '/dashboard/appointments', label: 'Appointments', icon: IconCalendar },
  { href: '/dashboard/patients', label: 'My patients', icon: IconUsers },
  { href: '/dashboard/queue', label: 'Patient queue', icon: IconClock },
  { href: '/records', label: 'Medical records', icon: IconFile },
  { href: '/prescriptions', label: 'Prescriptions', icon: IconPill },
  { href: '/lab-results', label: 'Lab results', icon: IconFlask },
  { href: '/messages', label: 'Messages', icon: IconChat },
  { href: '/documents', label: 'Documents', icon: IconClipboard },
  { href: '/profile', label: 'Profile', icon: IconUser },
];

function navFor(role) {
  return role === 'DOCTOR' ? DOCTOR_NAV : PATIENT_NAV;
}

function isActive(pathname, href) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({ open, onClose, items, isDoctor, onSignOut }) {
  const pathname = usePathname();

  const body = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <span className="grid size-9 place-items-center rounded-xl bg-primary-600 text-white">
            <IconStethoscope className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-ink">St. Aurelia</span>
            <span className="block text-[11px] uppercase tracking-wide text-muted">
              {isDoctor ? 'Clinician' : 'Patient'} portal
            </span>
          </span>
        </Link>
        <IconButton label="Close menu" className="lg:hidden" onClick={onClose}>
          <IconX className="size-5" />
        </IconButton>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Portal">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                    active ? 'bg-primary-50 text-primary-700' : 'text-ink hover:bg-canvas',
                  )}
                >
                  <item.icon className={cn('size-5 shrink-0', active ? 'text-primary-600' : 'text-muted')} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {isDoctor ? null : (
          <div className="mt-6 rounded-xl border border-line bg-canvas p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Need care?</p>
            <p className="mt-1 text-sm leading-relaxed text-ink">Book a consultation with a specialist.</p>
            <ButtonLink href="/appointments" size="sm" className="mt-3 w-full justify-center">
              Book appointment
            </ButtonLink>
          </div>
        )}
      </nav>

      <div className="border-t border-line px-3 py-3">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-danger-50 hover:text-danger-600"
        >
          <IconLogout className="size-5 text-muted" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-white lg:block">{body}</aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/40"
            onClick={onClose}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-lift">{body}</div>
        </div>
      ) : null}
    </>
  );
}

export default function DashboardShell({ title, description, actions, children, wide = false }) {
  const pathname = usePathname();
  const { user, role, isPatient, signOut, isLoading } = useAuth();
  const { connected } = useRealtime();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isDoctor = role === 'DOCTOR';
  const items = navFor(role);
  const displayName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '';

  return (
    <div className="flex min-h-dvh bg-canvas">
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={items}
        isDoctor={isDoctor}
        onSignOut={signOut}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <IconButton
              label="Open menu"
              className="lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
            >
              <IconMenu className="size-5" />
            </IconButton>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink sm:text-base">{title}</p>
              {description ? (
                <p className="hidden truncate text-xs text-muted sm:block">{description}</p>
              ) : null}
            </div>

            <span
              className={cn(
                'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex',
                connected ? 'bg-success-50 text-success-700' : 'bg-canvas text-muted',
              )}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {connected ? 'Live' : 'Offline'}
            </span>

            <NotificationsBell />

            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-canvas"
              title="Profile & settings"
            >
              <Avatar firstName={user?.firstName} lastName={user?.lastName} size="sm" />
              <span className="hidden text-sm font-medium text-ink md:block">
                {isLoading ? '…' : displayName}
              </span>
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <div className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:px-8', wide ? 'max-w-none' : 'max-w-7xl')}>
            {children}
          </div>
        </main>

        <footer className="border-t border-line bg-white px-4 py-4 text-center text-xs text-muted sm:px-6">
          {isPatient ? 'Your data is visible only to you and your care team.' : 'Clinical access is logged and audited.'}
        </footer>
      </div>
    </div>
  );
}
