'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import { cn } from '../../lib/utils';

/**
 * Button / link primitives.
 *
 * `Button` renders a real <button>; `ButtonLink` renders a real <Link> so both
 * are keyboard reachable, focusable and announce themselves correctly. As a
 * rule in this codebase, a <div> never pretends to be interactive.
 */

const VARIANTS = {
  primary:
    'bg-primary-600 text-white shadow-soft hover:bg-primary-700 focus-visible:outline-primary-700 disabled:bg-primary-300',
  secondary:
    'bg-white text-ink border border-line shadow-soft hover:border-primary-300 hover:text-primary-700 disabled:text-muted',
  ghost: 'text-ink hover:bg-primary-50 hover:text-primary-700 disabled:text-muted',
  soft: 'bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:text-primary-300',
  danger: 'bg-danger-600 text-white shadow-soft hover:bg-danger-700 disabled:bg-danger-500',
  success: 'bg-success-600 text-white shadow-soft hover:bg-success-700 disabled:bg-success-500',
  emergency: 'bg-danger-600 text-white shadow-soft hover:bg-danger-700',
  dark: 'bg-ink text-white shadow-soft hover:bg-slate-800 disabled:bg-slate-400',
  outlineDark: 'border border-white/30 text-white hover:bg-white/10',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
  icon: 'size-10 p-0',
  iconSm: 'size-9 p-0',
};

const BASE =
  'inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 disabled:cursor-not-allowed select-none active:scale-[0.98] motion-safe:hover:-translate-y-px';

export const Button = forwardRef(function Button(
  { className, variant = 'primary', size = 'md', as: Tag = 'button', loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      disabled={Tag === 'button' ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </Tag>
  );
});

export function ButtonLink({ className, variant = 'primary', size = 'md', children, ...props }) {
  return (
    <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </Link>
  );
}

export function Spinner({ className }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
      />
    </svg>
  );
}

export function IconButton({ label, className, children, size = 'iconSm', variant = 'ghost', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}