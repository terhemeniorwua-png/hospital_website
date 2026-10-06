import Link from 'next/link';
import { cn } from '../../lib/utils';
import { IconChevronRight } from '../ui/Icon';

/**
 * Consistent page chrome for inner pages: breadcrumb + title block, then the
 * page body. Using this everywhere means every route has the same heading
 * rhythm and exactly one <h1>.
 */

const CRUMB_CLASS = 'text-sm text-muted transition-colors hover:text-primary-700';

export function PageHeader({ eyebrow, title, description, breadcrumbs = [], actions, children, className }) {
  return (
    <header className={cn('border-b border-line bg-white', className)}>
      <div className="sa-container py-10 sm:py-14">
        {breadcrumbs.length ? (
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                    {index > 0 ? <IconChevronRight className="size-3.5 text-line" aria-hidden="true" /> : null}
                    {crumb.href && !isLast ? (
                      <Link href={crumb.href} className={CRUMB_CLASS}>
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={isLast ? 'font-medium text-ink' : CRUMB_CLASS} aria-current={isLast ? 'page' : undefined}>
                        {crumb.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            {eyebrow ? <span className="sa-eyebrow">{eyebrow}</span> : null}
            <h1 className={cn('mt-2 font-bold tracking-tight text-ink text-balance', eyebrow ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl')}>
              {title}
            </h1>
            {description ? <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
        </div>
        {children}
      </div>
    </header>
  );
}

/** Narrow reading-width container for prose pages. */
export function PageBody({ className, children, width = 'wide' }) {
  const widths = { narrow: 'max-w-3xl', medium: 'max-w-4xl', wide: 'max-w-6xl', full: '' };
  return (
    <div className={cn('sa-container py-10 sm:py-14', widths[width], className)}>{children}</div>
  );
}

export function PageSection({ title, description, children, className, id }) {
  return (
    <section id={id} className={cn('py-8', className)}>
      {title ? (
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h2>
          {description ? <p className="mt-2.5 text-base leading-relaxed text-muted">{description}</p> : null}
        </div>
      ) : null}
      <div className={cn(title && 'mt-6')}>{children}</div>
    </section>
  );
}

/** Bottom call-to-action strip reused at the end of marketing pages. */
export function CtaStrip({ title, description, primary, secondary }) {
  return (
    <section className="bg-primary-700 py-12 sm:py-16">
      <div className="sa-container flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-white text-balance sm:text-3xl">{title}</h2>
          {description ? <p className="mt-2.5 text-base leading-relaxed text-white/80">{description}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          {primary}
          {secondary}
        </div>
      </div>
    </section>
  );
}
