import { authFetch } from './api';

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchUsers(): Promise<ManagedUser[]> {
  const res = await authFetch('/api/users');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load users.');
  }
  return res.json();
}

export async function updateUserRole(id: string, role: string): Promise<ManagedUser> {
  const res = await authFetch(`/api/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update role.');
  }
  return res.json();
}

export async function setUserActive(id: string, isActive: boolean): Promise<ManagedUser> {
  const res = await authFetch(`/api/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update user status.');
  }
  return res.json();
}
