import type { Destination } from '../types';
import { authFetch } from './api';

export async function fetchDestinations(): Promise<Destination[]> {
  const response = await authFetch('/api/destinations');
  if (!response.ok) {
    throw new Error('Failed to load destinations.');
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}
