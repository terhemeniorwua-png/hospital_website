'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';
import { IconButton } from './Button';

/**
 * Accessible dialog shell.
 *
 * Handles the things a modal must get right: rendered in a portal, focus moved
 * inside on open, focus trapped while open, Escape to close, scroll locked, and
 * focus restored to the trigger on close.
 */
export function Modal({ open, onClose, title, description, size = 'md', children, footer, initialFocusRef }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusTarget = initialFocusRef?.current || panelRef.current;
    focusTarget?.focus?.();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose, initialFocusRef]);

  if (typeof document === 'undefined') return null;

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Dialog'}
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className={cn(
              'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-panel sm:rounded-2xl',
              widths[size],
            )}
          >
            {title ? (
              <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink">{title}</h2>
                  {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
                </div>
                <IconButton label="Close dialog" onClick={onClose}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </IconButton>
              </div>
            ) : null}

            <div className="sa-scrollbar-thin flex-1 overflow-y-auto px-5 py-5">{children}</div>

            {footer ? <div className="flex items-center justify-end gap-3 border-t border-line bg-canvas px-5 py-3.5">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}