'use client';

import { cn } from '../../lib/utils';
import { Button } from './Button';

/** Server-driven pagination driven by the backend's `pagination` envelope. */

export function Pagination({ pagination, onPageChange, className }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const pages = pageWindow(page, totalPages);

  return (
    <nav className={cn('flex flex-col items-center justify-between gap-3 sm:flex-row', className)} aria-label="Pagination">
      <p className="text-sm text-muted">
        Showing <span className="font-medium text-ink">{from}–{to}</span> of <span className="font-medium text-ink">{total}</span>
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((entry, index) =>
            entry === 'gap' ? (
              <span key={`gap-${index}`} className="px-1 text-sm text-muted" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onPageChange?.(entry)}
                aria-current={entry === page ? 'page' : undefined}
                className={cn(
                  'size-9 rounded-lg text-sm font-medium transition-colors',
                  entry === page ? 'bg-primary-600 text-white' : 'text-ink hover:bg-primary-50',
                )}
              >
                {entry}
              </button>
            ),
          )}
        </div>
        <span className="px-2 text-sm text-muted sm:hidden">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange?.(page + 1)}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

function pageWindow(current, total) {
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const output = [];
  let previous = 0;
  sorted.forEach((page) => {
    if (previous && page - previous > 1) output.push('gap');
    output.push(page);
    previous = page;
  });
  return output;
}