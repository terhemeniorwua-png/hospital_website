import { cn, initials } from '../../lib/utils';

const TONES = {
  primary: 'bg-primary-50 text-primary-700 ring-primary-100',
  success: 'bg-success-50 text-success-700 ring-success-100',
  warning: 'bg-warning-50 text-warning-700 ring-warning-100',
  danger: 'bg-danger-50 text-danger-700 ring-danger-100',
  teal: 'bg-teal-50 text-teal-700 ring-teal-100',
  muted: 'bg-canvas text-muted ring-line',
  dark: 'bg-slate-900 text-white ring-slate-700',
};

/**
 * Status pill. `tone` maps to the semantic colours defined in globals.css so a
 * clinical status always looks the same everywhere in the product.
 */
export function Badge({ tone = 'primary', size = 'md', className, children, ...props }) {
  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset whitespace-nowrap',
        TONES[tone] || TONES.primary,
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, meta = {}, size = 'md', className }) {
  const entry = meta[status] || { label: humanise(status), tone: 'muted' };
  return (
    <Badge tone={entry.tone} size={size} className={className}>
      {entry.dot !== false ? <span className="size-1.5 rounded-full bg-current opacity-70" /> : null}
      {entry.label}
    </Badge>
  );
}

/** Maps a snake_case / camelCase enum to a human label without a lookup table. */
export function humanise(value) {
  if (!value) return '';
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
}

export function Avatar({ src, firstName, lastName, name, size = 'md', className, ring = true }) {
  const sizes = {
    xs: 'size-8 text-[11px]',
    sm: 'size-10 text-xs',
    md: 'size-12 text-sm',
    lg: 'size-16 text-lg',
    xl: 'size-24 text-2xl',
  };
  const label = name || `${firstName || ''} ${lastName || ''}`.trim() || 'Profile photo';

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote avatar URLs are not optimisable at build time
      <img
        src={src}
        alt={label}
        loading="lazy"
        className={cn('shrink-0 rounded-full object-cover', ring && 'ring-2 ring-white', sizes[size], className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 font-bold text-primary-800 uppercase',
        ring && 'ring-2 ring-white',
        sizes[size],
        className,
      )}
    >
      {initials(firstName, lastName)}
    </span>
  );
}

/** Small pill used for filters, chips and tags. */
export function Chip({ active = false, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary-600 bg-primary-600 text-white'
          : 'border-line bg-white text-ink hover:border-primary-300 hover:text-primary-700',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}