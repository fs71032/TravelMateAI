import { authFetch } from './api';

export type Review = {
  id: string;
  target_table: string;
  target_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
};

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data as T;
}

export async function fetchReviews(): Promise<Review[]> {
  const res = await authFetch('/api/reviews');
  return parse<Review[]>(res);
}

export type CreateReviewPayload = {
  targetTable: string;
  targetId: string;
  userId: string;
  rating?: number;
  comment?: string;
};

export async function createReview(payload: CreateReviewPayload): Promise<Review> {
  const res = await authFetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parse<Review>(res);
}

export async function deleteReview(id: string): Promise<void> {
  const res = await authFetch(`/api/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || 'Delete failed');
  }
}
