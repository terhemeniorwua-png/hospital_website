import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className joiner used by every component. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value, currency = 'NGN') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Parses the value shapes the API actually returns.
 *
 * The backend sends `appointmentDate` as `YYYY-MM-DD` and slot times as `HH:MM`
 * in 24-hour form. `new Date()` cannot read either of those without inventing a
 * timezone, so both are normalised here rather than at every call site.
 */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const dateOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(trimmed);
    if (dateOnly) {
      const parsed = new Date(`${trimmed}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const timeOnly = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
    if (timeOnly) {
      const [, hours, minutes, seconds = '0'] = timeOnly;
      const parsed = new Date(2000, 0, 1, Number(hours), Number(minutes), Number(seconds));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatDate(value, options = {}) {
  const date = toDate(value);
  if (!date) return '—';
  // Accept the short presets ('full', 'long', 'short', 'day') as well as an
  // Intl options object, so call sites can be terse without risking a throw.
  const presets = {
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    short: { day: '2-digit', month: '2-digit' },
    day: { weekday: 'short', day: 'numeric', month: 'short' },
  };
  const resolved = typeof options === 'string' ? presets[options] || {} : options || {};
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...resolved,
  }).format(date);
}

export function formatTime(value) {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
}

export function formatDateTime(value) {
  if (!value) return '—';
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function timeAgo(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function initials(first = '', last = '') {
  return `${String(first || '').charAt(0)}${String(last || '').charAt(0)}`.toUpperCase() || '?';
}

export function fullName(person) {
  if (!person) return '';
  if (person.fullName) return person.fullName;
  return `${person.firstName || ''} ${person.lastName || ''}`.trim();
}

export function pluralise(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural || `${singular}s`}`;
}

/** YYYY-MM-DD in local time (avoids the UTC off-by-one of toISOString). */
export function toDateInputValue(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(value, days) {
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d;
}

export function isFutureDate(value) {
  const d = new Date(value);
  const today = new Date();
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}