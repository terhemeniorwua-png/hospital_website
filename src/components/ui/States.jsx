import { cn } from '../../lib/utils';
import { Button } from './Button';

/**
 * Loading / empty / error surfaces.
 *
 * Every data-backed view in the app renders one of these instead of inventing
 * placeholder content, so "no results" and "request failed" are always honest
 * and always actionable.
 */

export function Skeleton({ className }) {
  return <div className={cn('sa-skeleton', className)} aria-hidden="true" />;
}

export function CardSkeleton({ lines = 3, className }) {
  return (
    <div className={cn('rounded-xl border border-line bg-white p-5', className)}>
      <Skeleton className="h-5 w-2/3" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className={cn('h-3.5', index === lines - 1 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6, className, itemClassName }) {
  return (
    <div className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className)} role="status" aria-label="Loading content">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} className={itemClassName} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function ListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading content">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-xl border border-line bg-white p-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className, compact = false }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white text-center',
        compact ? 'px-5 py-8' : 'px-6 py-14',
        className,
      )}
    >
      {icon ? (
        <span className="mb-4 grid size-14 place-items-center rounded-full bg-primary-50 text-primary-600">{icon}</span>
      ) : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description, onRetry, className, compact = false }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-danger-100 bg-danger-50 text-center',
        compact ? 'px-5 py-8' : 'px-6 py-14',
        className,
      )}
    >
      <span className="mb-4 grid size-14 place-items-center rounded-full bg-danger-100 text-danger-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-7" aria-hidden="true">
          <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" />
        </svg>
      </span>
      <h3 className="text-base font-semibold text-danger-700">{title}</h3>
      {description ? <p className="mt-1.5 max-w-md text-sm text-danger-700/80">{description}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Small inline notice used for backend-contract gaps and advisories. */
export function Notice({ tone = 'info', title, children, icon, className }) {
  const tones = {
    info: 'border-primary-100 bg-primary-50 text-primary-900',
    warning: 'border-warning-100 bg-warning-50 text-warning-700',
    danger: 'border-danger-100 bg-danger-50 text-danger-700',
    success: 'border-success-100 bg-success-50 text-success-700',
    muted: 'border-line bg-canvas text-ink',
  };
  return (
    <div className={cn('flex gap-3 rounded-lg border p-4 text-sm', tones[tone] || tones.info, className)}>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn('leading-relaxed', title && 'mt-1')}>{children}</div> : null}
      </div>
    </div>
  );
}