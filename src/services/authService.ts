import { resolveApiUrl } from '../config/apiBase';
import { authFetch as authenticatedFetch } from './api';

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.length > 200 ? `${text.slice(0, 200)}...` : text;
    throw new Error(
      `The auth server returned an invalid response (${response.status}). Make sure the backend is running (cd backend && npm start) and you are using npm run dev, not opening the built dist folder directly. Response body: ${snippet}`
    );
  }
}

async function publicAuthFetch(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(resolveApiUrl(path), init);
  } catch {
    throw new Error(
      'Cannot reach the auth API. Start the backend in a separate terminal: cd backend && npm install && npm start. Then run the frontend with npm run dev from the project root.'
    );
  }
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await publicAuthFetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await parseJsonResponse<any>(response);

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to sign in.');
  }

  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await publicAuthFetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await parseJsonResponse<any>(response);

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to register.');
  }

  return data;
}

export type UpdateProfilePayload = {
  email: string;
  name: string;
  password?: string;
};

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await authenticatedFetch('/api/auth/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error(
      'Cannot reach the auth API. Start the backend in a separate terminal: cd backend && npm install && npm start. Then run the frontend with npm run dev from the project root.'
    );
  }

  const data = await parseJsonResponse<any>(response);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Your session expired. Please sign in again.');
    }
    throw new Error(data?.message || 'Failed to update profile.');
  }

  return data;
}
