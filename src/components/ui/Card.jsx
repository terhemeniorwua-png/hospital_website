import { cn } from '../../lib/utils';

/** Card surfaces used across marketing, portal and dashboard layouts. */

export function Card({ className, as: Tag = 'div', interactive = false, ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-xl border border-line bg-white shadow-soft',
        interactive && 'transition-all duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lift',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, title, description, action, icon }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-line px-5 py-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink">{title}</h3>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return <div className={cn('flex items-center gap-3 border-t border-line px-5 py-3.5', className)} {...props} />;
}

/** Section heading shared by every page for consistent rhythm. */
export function SectionHeading({ eyebrow, title, description, align = 'left', action, className }) {
  const alignment = align === 'center' ? 'mx-auto text-center items-center' : 'text-left items-start';
  return (
    <div className={cn('flex flex-col gap-3 md:flex-row md:items-end md:justify-between', alignment, className)}>
      <div className={cn('flex max-w-2xl flex-col gap-2', align === 'center' && 'mx-auto')}>
        {eyebrow ? <span className="sa-eyebrow">{eyebrow}</span> : null}
        <h2 className="text-balance text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
        {description ? <p className="text-pretty text-base leading-relaxed text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Label/value tile used on dashboards and summary panels. */
export function DataTile({ label, value, hint, tone = 'default', className }) {
  const tones = {
    default: 'bg-canvas',
    primary: 'bg-primary-50',
    success: 'bg-success-50',
    warning: 'bg-warning-50',
    danger: 'bg-danger-50',
    teal: 'bg-teal-50',
  };
  return (
    <div className={cn('rounded-lg p-4', tones[tone] || tones.default, className)}>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-ink tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** Definition row for record-style detail pages. */
export function DetailRow({ label, value, className }) {
  return (
    <div className={cn('flex flex-wrap items-baseline justify-between gap-2 py-2', className)}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink text-right">{value ?? '—'}</dd>
    </div>
  );
}