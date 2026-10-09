'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, onAuthChange } from '../../lib/api/client';
import * as authService from '../../lib/services/auth';
import { disconnectSocket } from '../../lib/socket';

/**
 * Session context.
 *
 * One place owns "who is signed in". Every protected surface reads `user` from
 * here, and the auth modal / login pages call `signIn` so behaviour (redirect,
 * socket teardown, toasts) stays identical no matter how a session starts.
 */

const AuthContext = createContext(null);

const STAFF_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'DOCTOR',
  'NURSE',
  'PHARMACIST',
  'LAB_TECHNICIAN',
  'LAB',
  'RECEPTIONIST',
  'RECEPTION',
  'ACCOUNTANT',
  'INSURANCE_MANAGER',
  'PHARMACY_MANAGER',
];

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState(null);

  /* Restore an existing session on first mount. */
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const current = await authService.fetchCurrentUser();
        if (cancelled) return;
        setUser(current);
        setStatus(current ? 'authenticated' : 'anonymous');
      } catch {
        if (cancelled) return;
        clearSession();
        setUser(null);
        setStatus('anonymous');
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  /* The API client emits when a token refresh fails or a session is cleared. */
  useEffect(
    () =>
      onAuthChange((event) => {
        if (event.type === 'signed-out') {
          setUser(null);
          setStatus('anonymous');
          disconnectSocket();
        }
      }),
    [],
  );

  const signIn = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    // `POST /auth/login` returns only the sanitised account. Permissions,
    // `patient` and `doctorProfile` come from `GET /auth/me`, which the portal
    // gates on, so fetch it now rather than waiting for a page reload.
    let account = data.user;
    try {
      account = (await authService.fetchCurrentUser()) || data.user;
    } catch {
      /* Keep the login payload if the follow-up fetch fails. */
    }
    setUser(account);
    setStatus('authenticated');
    setAuthModalOpen(false);
    setAuthModalReason(null);
    return account;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authService.register(payload);
    if (data?.user) {
      let account = data.user;
      try {
        account = (await authService.fetchCurrentUser()) || data.user;
      } catch {
        /* Registration already succeeded; the profile can load on reload. */
      }
      setUser(account);
      setStatus('authenticated');
    }
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setStatus('anonymous');
    disconnectSocket();
    router.push('/');
  }, [router]);

  const openAuthModal = useCallback((reason = null) => {
    setAuthModalReason(reason);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const current = await authService.fetchCurrentUser();
    setUser(current);
    return current;
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      isPatient: user?.role === 'PATIENT',
      isStaff: Boolean(user?.role && STAFF_ROLES.includes(user.role)),
      role: user?.role || null,
      patientId: user?.patientId || null,
      authModalOpen,
      authModalReason,
      openAuthModal,
      closeAuthModal,
      signIn,
      signUp: register,
      signOut,
      refreshUser,
    }),
    [
      user,
      status,
      authModalOpen,
      authModalReason,
      openAuthModal,
      closeAuthModal,
      signIn,
      register,
      signOut,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

export default AuthContext;