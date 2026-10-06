'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthProvider';
import { disconnectSocket, isConnected, subscribe } from '../../lib/socket';

/**
 * RealtimeProvider
 *
 * Owns the single Socket.IO connection for the whole app and shares its status
 * plus a lightweight `revision` counter. Any view can depend on `revision` to
 * refetch when a relevant server event lands, instead of every component
 * opening its own connection.
 */

const RealtimeContext = createContext({ connected: false, revision: 0, bump: () => {} });

export function RealtimeProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      setConnected(false);
      return undefined;
    }

    const bump = () => setRevision((value) => value + 1);

    /* Connection lifecycle: only used to drive the "live" indicator. */
    const unsubscribeStatus = subscribe(
      'connect',
      () => setConnected(true),
      { immediate: false },
    );
    const unsubscribeDisconnect = subscribe(
      'disconnect',
      () => setConnected(false),
      { immediate: false },
    );

    /* A short debounce-free bump on the first connected event keeps the very
       first handshake from triggering a redundant refetch storm. */
    let hydrated = false;
    const unsubscribeReady = subscribe('connect', () => {
      if (hydrated) bump();
      hydrated = true;
    }, { immediate: false });

    return () => {
      unsubscribeStatus();
      unsubscribeDisconnect();
      unsubscribeReady();
      setConnected(false);
    };
  }, [isAuthenticated, user?.id]);

  const value = useMemo(() => ({ connected, revision, bump: () => setRevision((v) => v + 1) }), [connected, revision]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

export { isConnected };
