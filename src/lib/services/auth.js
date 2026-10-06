import { api, apiFetch, clearSession, getTokens, setTokens } from '../api/client';

/**
 * Auth + profile endpoints.
 * Response shape (verified): `{ user, accessToken, refreshToken, expiresIn }`.
 */

export async function login(credentials) {
  const response = await api.post('/auth/login', credentials, { auth: false });
  setTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });
  return response.data;
}

export async function register(payload) {
  const response = await api.post('/auth/register', payload, { auth: false });
  if (response.data?.accessToken) {
    setTokens({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    });
  }
  return response.data;
}

/** Restores the session on page load / hard refresh. */
export async function fetchCurrentUser() {
  const tokens = getTokens();
  if (!tokens?.accessToken) return null;
  const response = await api.get('/auth/me');
  return response.data;
}

export async function logout() {
  try {
    if (getTokens()?.refreshToken) {
      await api.post('/auth/logout', { refreshToken: getTokens().refreshToken });
    }
  } catch {
    /* a failed logout must still clear the local session */
  } finally {
    clearSession();
  }
}

export async function logoutAll() {
  try {
    await api.post('/auth/logout-all');
  } finally {
    clearSession();
  }
}

export async function changePassword(payload) {
  return api.post('/auth/change-password', payload);
}

export async function forgotPassword(email) {
  return api.post('/auth/forgot-password', { email }, { auth: false });
}

export async function resetPassword(payload) {
  return api.post('/auth/reset-password', payload, { auth: false });
}

export async function updateProfile(payload) {
  return apiFetch('/auth/me', { method: 'PATCH', body: payload });
}

export async function getPatients(query) {
  return api.get('/patients/', { query });
}

export async function getPatient(id) {
  return api.get(`/patients/${id}`);
}

export async function updatePatient(id, payload) {
  return apiFetch(`/patients/${id}`, { method: 'PUT', body: payload });
}

export async function getPatientSummary(patientId) {
  return api.get(`/medical-records/${patientId}/summary`);
}

export async function getPatientAllergies(patientId) {
  return api.get(`/patients/${patientId}/allergies`);
}