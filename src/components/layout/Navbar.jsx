'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { config } from '../../lib/config';
import { cn } from '../../lib/utils';
import { Button, ButtonLink, IconButton } from '../ui/Button';
import { Avatar, Badge } from '../ui/Badge';
import {
  IconCalendar,
  IconCart,
  IconChat,
  IconChevronDown,
  IconFile,
  IconFlask,
  IconGrid,
  IconLogout,
  IconMapPin,
  IconMenu,
  IconPhone,
  IconPill,
  IconSearch,
  IconStethoscope,
  IconUser,
  IconWallet,
  IconX,
} from '../ui/Icon';
import { useAuth } from '../providers/AuthProvider';
import { useCart } from '../providers/CartProvider';
import AuthModal from './AuthModal';

const PRIMARY_LINKS = [
  { href: '/doctors', label: 'Find a doctor' },
  { href: '/pharmacy', label: 'Pharmacy' },
  { href: '/appointments', label: 'Appointments' },
  { href: '/services', label: 'Services' },
  { href: '/emergency', label: 'Emergency' },
];

const PORTAL_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: IconGrid },
  { href: '/appointments', label: 'Appointments', icon: IconCalendar },
  { href: '/records', label: 'Medical records', icon: IconFile },
  { href: '/prescriptions', label: 'Prescriptions', icon: IconPill },
  { href: '/lab-results', label: 'Lab results', icon: IconFlask },
  { href: '/billing', label: 'Billing', icon: IconWallet },
  { href: '/messages', label: 'Messages', icon: IconChat },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, user, isStaff, signOut, openAuthModal } = useAuth();
  const { count } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
    setServicesOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return undefined;
    function onPointerDown(event) {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') setAccountOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-lg">
      {/* Utility strip */}
      <div className="hidden bg-ink text-white md:block">
        <div className="sa-container flex h-9 items-center justify-between text-xs">
          <p className="flex items-center gap-2 text-white/80">
            <IconMapPin className="size-3.5" />
            {config.hospital.address}
          </p>
          <div className="flex items-center gap-6">
            <a href={`tel:${config.hospital.emergencyPhone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 font-semibold text-white transition hover:text-primary-300">
              <IconPhone className="size-3.5" />
              Emergency {config.hospital.emergencyPhone}
            </a>
            <span className="text-white/60">24-hour emergency department</span>
            <a href={`mailto:${config.hospital.email}`} className="text-white/80 transition hover:text-white">
              {config.hospital.email}
            </a>
          </div>
        </div>
      </div>

      <div className="sa-container flex h-16 items-center justify-between gap-4 lg:h-18">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${config.hospital.name} home`}>
          <span className="grid size-10 place-items-center rounded-xl bg-primary-600 text-white shadow-soft">
            <IconStethoscope className="size-6" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-ink">{config.hospital.shortName}</span>
            <span className="block text-[11px] font-medium tracking-wide text-muted uppercase">Teaching Hospital</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              type="button"
              aria-expanded={servicesOpen}
              onClick={() => setServicesOpen((open) => !open)}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink transition hover:bg-primary-50 hover:text-primary-700"
            >
              Services
              <IconChevronDown className={cn('size-4 transition-transform', servicesOpen && 'rotate-180')} />
            </button>
            {servicesOpen ? (
              <div className="absolute top-full left-0 w-72 rounded-xl border border-line bg-white p-2 shadow-lift">
                {['General & internal medicine', 'Orthopaedics & trauma', 'Obstetrics & gynaecology', 'Paediatrics', 'Diagnostics & laboratory', 'Pharmacy'].map(
                  (service) => (
                    <Link
                      key={service}
                      href="/services"
                      className="block rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-primary-50 hover:text-primary-700"
                    >
                      {service}
                    </Link>
                  ),
                )}
                <Link href="/departments" className="mt-1 block rounded-lg bg-primary-50 px-3 py-2 text-center text-sm font-semibold text-primary-700">
                  All departments
                </Link>
              </div>
            ) : null}
          </div>

          {PRIMARY_LINKS.filter((link) => link.href !== '/services').map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive(link.href) ? 'bg-primary-50 text-primary-700' : 'text-ink hover:bg-primary-50 hover:text-primary-700',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <IconButton label="Search the site" className="hidden sm:inline-flex" onClick={() => (window.location.href = '/search')}>
            <IconSearch className="size-5" />
          </IconButton>

          <Link
            href="/cart"
            aria-label={`Pharmacy basket, ${count} item${count === 1 ? '' : 's'}`}
            className="relative hidden size-10 place-items-center rounded-full text-ink transition hover:bg-primary-50 hover:text-primary-700 sm:grid"
          >
            <IconCart className="size-5" />
            {count > 0 ? (
              <span className="absolute top-0.5 right-0 grid min-w-4.5 place-items-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            ) : null}
          </Link>

          {isAuthenticated ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pr-3 pl-1 transition hover:border-primary-300"
              >
                <Avatar firstName={user?.firstName} lastName={user?.lastName} name={user?.fullName} size="xs" />
                <span className="hidden max-w-28 truncate text-sm font-medium text-ink sm:block">
                  {user?.firstName || user?.fullName}
                </span>
                <IconChevronDown className="size-4 text-muted" />
              </button>

              {accountOpen ? (
                <div role="menu" className="absolute right-0 mt-2 w-64 rounded-xl border border-line bg-white p-2 shadow-lift">
                  <div className="border-b border-line px-3 pt-1 pb-3">
                    <p className="text-sm font-semibold text-ink">{user?.fullName || `${user?.firstName} ${user?.lastName}`}</p>
                    <p className="truncate text-xs text-muted">{user?.email}</p>
                    <Badge tone={isStaff ? 'primary' : 'teal'} size="sm" className="mt-2">
                      {isStaff ? 'Staff portal' : 'Patient'}
                    </Badge>
                  </div>
                  <div className="py-1">
                    <Link href="/dashboard" role="menuitem" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-primary-50">
                      <IconGrid className="size-4 text-muted" />
                      Dashboard
                    </Link>
                    <Link href="/messages" role="menuitem" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-primary-50">
                      <IconChat className="size-4 text-muted" />
                      Messages
                    </Link>
                    <Link href="/profile" role="menuitem" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-primary-50">
                      <IconUser className="size-4 text-muted" />
                      Profile &amp; settings
                    </Link>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    className="flex w-full items-center gap-2.5 rounded-lg border-t border-line px-3 py-2.5 text-sm font-medium text-danger-600 transition hover:bg-danger-50"
                  >
                    <IconLogout className="size-4" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="md" onClick={() => openAuthModal({ intent: 'signin' })}>
                Sign in
              </Button>
              <ButtonLink href="/register" variant="primary" size="md">
                Create account
              </ButtonLink>
            </div>
          )}

          <IconButton
            label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <IconX className="size-5" /> : <IconMenu className="size-5" />}
          </IconButton>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="border-t border-line bg-white lg:hidden">
          <nav className="sa-container flex flex-col gap-1 py-4" aria-label="Mobile">
            {[...PRIMARY_LINKS, { href: '/departments', label: 'Departments' }, { href: '/about', label: 'About' }, { href: '/contact', label: 'Contact' }].map(
              (link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium transition',
                    isActive(link.href) ? 'bg-primary-50 text-primary-700' : 'text-ink hover:bg-primary-50',
                  )}
                >
                  {link.label}
                </Link>
              ),
            )}
            <Link href="/cart" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-primary-50">
              <IconCart className="size-4" />
              Pharmacy basket
              {count > 0 ? <Badge tone="primary" size="sm">{count}</Badge> : null}
            </Link>
            <div className="mt-2 flex gap-2 border-t border-line pt-4">
              {isAuthenticated ? (
                <>
                  <ButtonLink href="/dashboard" variant="primary" size="md" className="flex-1">
                    My dashboard
                  </ButtonLink>
                  <Button variant="secondary" size="md" onClick={signOut}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="md"
                    className="flex-1"
                    onClick={() => {
                      setMobileOpen(false);
                      openAuthModal({ intent: 'signin' });
                    }}
                  >
                    Sign in
                  </Button>
                  <ButtonLink href="/register" variant="primary" size="md" className="flex-1">
                    Create account
                  </ButtonLink>
                </>
              )}
            </div>
            <a
              href={`tel:${config.hospital.emergencyPhone.replace(/\s/g, '')}`}
              className="mt-3 flex items-center justify-center gap-2 rounded-full bg-danger-50 px-4 py-2.5 text-sm font-semibold text-danger-700"
            >
              <IconPhone className="size-4" />
              Emergency {config.hospital.emergencyPhone}
            </a>
          </nav>
        </div>
      ) : null}

      <AuthModal />
    </header>
  );
}


export { PORTAL_LINKS };
