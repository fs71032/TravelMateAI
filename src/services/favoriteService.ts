import { authFetch } from './api';

export type Favorite = {
  id: string;
  user_id: string;
  entity: string;
  entity_id: string;
  created_at: string;
  /** @deprecated use entity */
  target_table?: string;
  /** @deprecated use entity_id */
  target_id?: string;
};

function normalizeFavorite(raw: Record<string, unknown>): Favorite {
  return {
    id: String(raw.id ?? ''),
    user_id: String(raw.user_id ?? ''),
    entity: String(raw.entity ?? raw.target_table ?? ''),
    entity_id: String(raw.entity_id ?? raw.target_id ?? ''),
    created_at: String(raw.created_at ?? ''),
    target_table: raw.target_table ? String(raw.target_table) : undefined,
    target_id: raw.target_id ? String(raw.target_id) : undefined
  };
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data as T;
}

export async function fetchFavorites(): Promise<Favorite[]> {
  const res = await authFetch('/api/favorites');
  const data = await parse<Record<string, unknown>[]>(res);
  return Array.isArray(data) ? data.map(normalizeFavorite) : [];
}

export type CreateFavoritePayload = {
  userId: string;
  targetTable: string;
  targetId: string;
};

export async function createFavorite(payload: CreateFavoritePayload): Promise<Favorite> {
  const res = await authFetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await parse<Record<string, unknown>>(res);
  return normalizeFavorite(data);
}

export async function deleteFavorite(id: string): Promise<void> {
  const res = await authFetch(`/api/favorites/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || 'Delete failed');
  }
}
