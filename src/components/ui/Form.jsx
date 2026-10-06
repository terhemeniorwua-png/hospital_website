'use client';

import { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

const FIELD_BASE =
  'w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted';

function FieldShell({ id, label, hint, error, required, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger-600" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id, hint, error) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export const Input = forwardRef(function Input(
  { label, hint, error, className, containerClassName, required, id: providedId, leading, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId || generatedId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={containerClassName}>
      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted">{leading}</span>
        ) : null}
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(FIELD_BASE, 'h-11', leading && 'pl-10', error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/25', className)}
          {...props}
        />
      </div>
    </FieldShell>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, className, containerClassName, required, id: providedId, rows = 4, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId || generatedId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={containerClassName}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(FIELD_BASE, 'py-2.5 leading-relaxed', error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/25', className)}
        {...props}
      />
    </FieldShell>
  );
});

export const Select = forwardRef(function Select(
  { label, hint, error, className, containerClassName, required, id: providedId, children, options, placeholder, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId || generatedId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={containerClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(
            FIELD_BASE,
            'h-11 appearance-none pr-10',
            error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/25',
            className,
          )}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </FieldShell>
  );
});

export function Checkbox({ label, description, className, id: providedId, ...props }) {
  const generatedId = useId();
  const id = providedId || generatedId;
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3 text-sm', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4.5 shrink-0 rounded border-line text-primary-600 accent-primary-600 focus-visible:outline-primary-600"
        {...props}
      />
      <span>
        <span className="font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export function RadioCard({ label, description, value, checked, onChange, icon, className }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all duration-200',
        checked ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/30' : 'border-line bg-white hover:border-primary-300',
        className,
      )}
    >
      <input
        type="radio"
        value={value}
        checked={checked}
        onChange={() => onChange?.(value)}
        className="sr-only"
      />
      {icon ? <span className="shrink-0 text-primary-700">{icon}</span> : null}
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span> : null}
      </span>
    </label>
  );
}