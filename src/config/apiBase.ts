const DEFAULT_BACKEND_URL = 'http://localhost:4000';

function readApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim();
  }
  return import.meta.env.DEV ? '' : DEFAULT_BACKEND_URL;
}

/** In dev, empty value routes /api through the Vite proxy (same port as the UI). */
export const API_BASE_URL = readApiBaseUrl();

export function resolveApiUrl(path: string): string {
  if (path.startsWith('/api')) {
    return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  }
  return path;
}

export function getSocketUrl(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return DEFAULT_BACKEND_URL;
  }
  return API_BASE_URL || DEFAULT_BACKEND_URL;
}