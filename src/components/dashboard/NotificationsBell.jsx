'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '../../lib/utils';
import { useRealtime } from '../providers/RealtimeProvider';
import { IconButton } from '../ui/Button';
import { IconBell, IconCheck, IconMailbox, IconX } from '../ui/Icon';
import { humanise } from '../ui/Badge';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
  unreadNotificationCount,
} from '../../lib/services/messaging';

const PANEL_WIDTH = 'w-[min(92vw,22rem)]';

function timeAgo(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString();
}

/**
 * Notification bell for the portal topbar.
 *
 * The unread badge is driven by `GET /notifications/unread-count` and refetched
 * whenever the realtime layer reports a revision, so a push notification
 * arriving over the socket lights the badge without polling.
 */
export default function NotificationsBell() {
  const { revision } = useRealtime();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [countResponse, listResponse] = await Promise.all([
        unreadNotificationCount().catch(() => null),
        listNotifications({ limit: 10 }),
      ]);
      setCount(unreadCount(countResponse?.data ?? countResponse));
      setItems(Array.isArray(listResponse?.data) ? listResponse.data : []);
      setError(null);
    } catch (caught) {
      setError(caught?.message || 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, revision]);

  /* Close on outside click / Escape. */
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const openOne = async (notification) => {
    if (notification.readAt) return;
    try {
      await markNotificationRead(notification.id);
      setItems((current) =>
        current.map((entry) => (entry.id === notification.id ? { ...entry, readAt: new Date().toISOString() } : entry)),
      );
      setCount((value) => Math.max(0, value - 1));
    } catch {
      /* A failed read mark is not worth breaking the panel over. */
    }
  };

  const markAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await markAllNotificationsRead();
      setItems((current) => current.map((entry) => ({ ...entry, readAt: entry.readAt || new Date().toISOString() })));
      setCount(0);
    } catch (caught) {
      setError(caught?.message || 'Could not mark notifications as read');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <IconButton
        label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative"
      >
        <IconBell className="size-5" />
        {count > 0 ? (
          <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-danger-500 px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white">
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </IconButton>

      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute right-0 z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-lift',
            PANEL_WIDTH,
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={markAll}
                disabled={busy || count === 0}
                className="rounded-md px-2 py-1 text-xs font-medium text-primary-600 transition hover:bg-primary-50 disabled:text-muted disabled:hover:bg-transparent"
              >
                <IconCheck className="inline size-3.5" /> Mark all read
              </button>
              <IconButton label="Close notifications" onClick={() => setOpen(false)}>
                <IconX className="size-4" />
              </IconButton>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <ul className="divide-y divide-line">
                {Array.from({ length: 3 }).map((_, index) => (
                  <li key={index} className="px-4 py-3">
                    <div className="sa-skeleton h-3 w-3/4 rounded" />
                    <div className="sa-skeleton mt-2 h-2.5 w-1/3 rounded" />
                  </li>
                ))}
              </ul>
            ) : error ? (
              <p className="px-4 py-6 text-center text-sm text-danger-600">{error}</p>
            ) : items.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <IconMailbox className="mx-auto size-8 text-muted" />
                <p className="mt-2 text-sm font-medium text-ink">You are all caught up</p>
                <p className="mt-1 text-xs text-muted">Appointment and result updates appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((notification) => {
                  const read = Boolean(notification.readAt || notification.read);
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => openOne(notification)}
                        className={cn(
                          'block w-full px-4 py-3 text-left transition hover:bg-canvas',
                          read && 'opacity-70',
                        )}
                      >
                        <span className="flex items-start gap-2">
                          {!read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary-500" /> : null}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-ink">
                              {notification.title || humanise(notification.type || 'Notification')}
                            </span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                              {notification.body || notification.message}
                            </span>
                            <span className="mt-1 block text-[11px] text-muted">{timeAgo(notification.createdAt)}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Link
            href="/messages"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-2.5 text-center text-xs font-semibold text-primary-600 transition hover:bg-primary-50"
          >
            Open messages
          </Link>
        </div>
      ) : null}
    </div>
  );
}
