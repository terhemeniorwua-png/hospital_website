'use client';

import { useAsync } from '../../hooks/useAsync';
import { cn } from '../../lib/utils';
import { CardSkeleton, EmptyState, ErrorState } from '../ui/States';

/**
 * Shared building blocks for the portal screens.
 *
 * `AsyncView` is the load/error/empty contract every data panel goes through,
 * so no page hand-rolls its own spinner or swallows a failed request.
 */

function payloadOf(data) {
  if (data && typeof data === 'object' && 'data' in data) return data.data;
  return data;
}

function isBlank(data) {
  const payload = payloadOf(data);
  if (Array.isArray(payload)) return payload.length === 0;
  if (payload && typeof payload === 'object') return Object.keys(payload).length === 0;
  return payload == null;
}

/**
 * @param {object} props
 * @param {() => Promise<any>} props.fetcher
 * @param {any[]} [props.deps] refetch triggers (page, filters, realtime revision)
 * @param {(reload: () => void) => any} props.children renderer for a non-empty payload
 */
export function AsyncView({ fetcher, deps = [], skeleton, empty, isEmpty, children, className }) {
  const { data, error, loading, reload } = useAsync(fetcher, deps);

  if (loading) {
    return <div className={className}>{skeleton ?? <CardSkeleton />}</div>;
  }
  if (error) {
    return (
      <ErrorState
        title="Could not load this section"
        description={error?.message || 'The request failed. Please try again.'}
        onRetry={reload}
        className={className}
      />
    );
  }
  const blank = isEmpty ? isEmpty(data) : isBlank(data);
  if (blank) {
    return <div className={className}>{empty ?? <EmptyState title="Nothing here yet" description="New activity will appear here." />}</div>;
  }
  return children(data, reload);
}

const STAT_TONES = {
  default: 'bg-canvas text-ink',
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
  teal: 'bg-teal-50 text-teal-700',
};

/** Headline metric tile used along the top of both dashboards. */
export function StatCard({ label, value, hint, icon: Icon, tone = 'primary', className }) {
  return (
    <div className={cn('rounded-xl border border-line bg-white p-4 shadow-soft sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 truncate text-3xl font-bold tabular-nums text-ink">{value ?? '—'}</p>
          {hint ? <p className="mt-1 truncate text-xs text-muted">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', STAT_TONES[tone])}>
            <Icon className="size-5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Responsive card grid used for stat rows and panel boards. */
export function StatGrid({ children, className }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>;
}

/** Filter/search bar that sits above a list. */
export function Toolbar({ children, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} role="search">
      {children}
    </div>
  );
}

/** Two-column layout: sticky sidebar of detail beside a stack of panels. */
export function SplitLayout({ aside, children, className }) {
  return (
    <div className={cn('grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]', className)}>
      <div className="min-w-0 space-y-6">{children}</div>
      <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">{aside}</aside>
    </div>
  );
}
