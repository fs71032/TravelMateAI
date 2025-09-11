export type SearchResults = {
  query: string;
  filters: { category: string | null; status: string | null; dateFrom: string | null; dateTo: string | null };
  sort: Record<string, string>;
  destinations: any[];
  trip_plans: any[];
  bookings: any[];
  messages: any[];
  users: any[];
};

export type SearchFilters = {
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type SearchSort = {
  destinationsSort?: string;
  tripPlansSort?: string;
  bookingsSort?: string;
  messagesSort?: string;
  usersSort?: string;
};

import { authFetch } from './api';

export async function searchAll(
  q: string,
  limit = 10,
  offset = 0,
  useFts = false,
  filters: SearchFilters = {},
  sort: SearchSort = {}
): Promise<SearchResults> {
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    offset: String(offset),
    fts: useFts ? '1' : '0'
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  Object.entries(sort).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const res = await authFetch(`/api/search?${params.toString()}`);
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData?.message || 'Search failed');
    }
    const errorText = await res.text().catch(() => 'Search failed');
    throw new Error(errorText || 'Search failed');
  }

  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Search returned invalid response format: ${text.slice(0, 200)}`);
  }

  return res.json();
}
