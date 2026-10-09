'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { config } from '../../lib/config';
import { cn } from '../../lib/utils';
import { IconAmbulance, IconCalendar, IconChat, IconGrid, IconPhone } from '../ui/Icon';
import { useAuth } from '../providers/AuthProvider';
import { useCart } from '../providers/CartProvider';

/**
 * Floating action dock.
 *
 * Mobile-first quick access to the four things a patient reaches for most:
 * book, dashboard, messages and emergency call. Hidden on portal routes where a
 * sidebar already provides navigation, and collapses to a single emergency
 * button once the patient scrolls past the hero.
 */

const ACTIONS = [
  { href: '/appointments', label: 'Book', icon: IconCalendar, requiresAuth: false },
  { href: '/dashboard', label: 'Dashboard', icon: IconGrid, requiresAuth: true },
  { href: '/messages', label: 'Messages', icon: IconChat, requiresAuth: true },
];

export default function QuickActions() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { count } = useCart();
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(true);

  /* The dock is redundant inside the portal, which has its own sidebar. */
  const isPortal = /^\/(dashboard|appointments|records|prescriptions|lab-results|billing|messages|profile|documents|checkout|cart)(\/|$)/.test(
    pathname,
  );

  useEffect(() => {
    const onScroll = () => setExpanded(window.scrollY < 320);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (isPortal) return null;

  const emergencyHref = `tel:${config.hospital.emergencyPhone.replace(/\s/g, '')}`;
  const actions = ACTIONS.filter((action) => !action.requiresAuth || isAuthenticated);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:hidden">
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="pointer-events-auto mx-auto flex max-w-md items-center gap-1.5 rounded-full border border-line bg-white/95 p-1.5 shadow-panel backdrop-blur"
          >
            <a
              href={emergencyHref}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-danger-600 px-4 py-3 text-sm font-bold text-white"
            >
              <IconAmbulance className="size-4.5" />
              Emergency
            </a>
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-semibold text-ink transition hover:bg-primary-50"
              >
                <action.icon className="size-5 text-primary-700" />
                {action.label}
              </Link>
            ))}
            <Link
              href="/pharmacy"
              className={cn(
                'relative flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-semibold text-ink transition hover:bg-primary-50',
              )}
            >
              <span className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="size-5 text-primary-700" aria-hidden="true">
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2 3h2.2l2.4 11.3a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.6L20.7 7H5.3" strokeLinecap="round" />
                </svg>
                {count > 0 ? (
                  <span className="absolute -top-1 -right-1.5 grid min-w-4 place-items-center rounded-full bg-primary-600 px-1 text-[9px] font-bold text-white">
                    {count}
                  </span>
                ) : null}
              </span>
              Basket
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-auto ml-auto"
          >
            <a
              href={emergencyHref}
              aria-label={`Call the emergency line ${config.hospital.emergencyPhone}`}
              className="sa-pulse-ring grid size-14 place-items-center rounded-full bg-danger-600 text-white shadow-lift"
            >
              <IconPhone className="size-6" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
