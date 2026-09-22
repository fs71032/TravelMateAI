import { resolveApiUrl } from '../config/apiBase';

const AUTH_STORAGE_KEY = 'travelmate_auth';
export const AUTH_UPDATED_EVENT = 'travelmate-auth-updated';

function notifyAuthUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_UPDATED_EVENT));
  }
}

function isAccessTokenExpired(token: string, skewMs = 30_000): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000 - skewMs;
  } catch {
    return true;
  }
}

export function getAccessToken(): string | undefined {
  const stored = getStoredAuthData();
  return typeof stored?.accessToken === 'string' && stored.accessToken.length > 0
    ? stored.accessToken
    : undefined;
}

function getStoredAuthData(): Record<string, unknown> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function setStoredAuthData(data: Record<string, unknown> | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (data) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export function getAuthHeaders(): HeadersInit {
  const stored = getStoredAuthData();
  const token = typeof stored?.accessToken === 'string' ? stored.accessToken : undefined;
  const headers = new Headers();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function tryRefreshToken(): Promise<boolean> {
  const stored = getStoredAuthData();
  const refreshToken = typeof stored?.refreshToken === 'string' ? stored.refreshToken : undefined;
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(resolveApiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      setStoredAuthData(null);
      return false;
    }

    const data = await response.json();
    // Preserve the rest of the stored auth (notably `user`, which AuthContext relies on
    // to survive a page reload) instead of clobbering it with just the token pair.
    setStoredAuthData({
      ...stored,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || refreshToken,
      user: data.user || stored?.user
    });
    notifyAuthUpdated();
    return true;
  } catch {
    setStoredAuthData(null);
    return false;
  }
}

/** Returns a valid access token, refreshing from localStorage when expired. */
export async function ensureFreshAccessToken(): Promise<string | undefined> {
  let token = getAccessToken();
  if (token && !isAccessTokenExpired(token)) {
    return token;
  }

  const didRefresh = await tryRefreshToken();
  if (!didRefresh) {
    return undefined;
  }

  token = getAccessToken();
  return token && !isAccessTokenExpired(token) ? token : undefined;
}

function resolveRequestUrl(input: RequestInfo): RequestInfo {
  if (typeof input === 'string') {
    return resolveApiUrl(input);
  }
  return input;
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const authHeaders = getAuthHeaders();

  if (authHeaders instanceof Headers) {
    authHeaders.forEach((value, key) => headers.set(key, value));
  }

  const requestInput = resolveRequestUrl(input);
  let response = await fetch(requestInput, { ...init, headers });
  if (response.status !== 401) {
    return response;
  }

  const didRefresh = await tryRefreshToken();
  if (!didRefresh) {
    return response;
  }

  const refreshedHeaders = new Headers(init.headers);
  const refreshedAuthHeaders = getAuthHeaders();
  if (refreshedAuthHeaders instanceof Headers) {
    refreshedAuthHeaders.forEach((value, key) => refreshedHeaders.set(key, value));
  }

  return fetch(resolveRequestUrl(input), { ...init, headers: refreshedHeaders });
}
