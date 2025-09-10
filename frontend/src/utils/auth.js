// Lightweight auth helpers (no external libs)
export function getToken() {
  return localStorage.getItem('token') || '';
}

export function setToken(token) {
  if (token) localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export function decodeJwt(token) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getRole() {
  const token = getToken();
  const payload = decodeJwt(token);
  return payload?.role || null;
}

export function isExpired() {
  const token = getToken();
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
}

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export async function authFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}