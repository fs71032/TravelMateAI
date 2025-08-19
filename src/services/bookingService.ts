import type { Booking } from '../types';
import { authFetch } from './api';

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return data?.message || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchBookings(): Promise<Booking[]> {
  const response = await authFetch('/api/bookings');
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not load bookings.'));
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export type CreateBookingPayload = {
  type: string;
  title: string;
  date: string;
  amount?: string;
  location?: string;
  details?: string;
};

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  const response = await authFetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to create booking.'));
  }

  return response.json();
}

export async function updateBookingStatus(id: string, status: string): Promise<Booking> {
  const response = await authFetch(`/api/bookings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    const message = await parseError(response, 'Failed to update booking.');
    if (response.status === 404) {
      throw new Error(`${message} Restart the backend: npm run backend`);
    }
    throw new Error(message);
  }

  return response.json();
}

export async function deleteBooking(id: string): Promise<void> {
  const response = await authFetch(`/api/bookings/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const message = await parseError(response, 'Failed to delete booking.');
    if (response.status === 404) {
      throw new Error(`${message} Restart the backend: npm run backend`);
    }
    throw new Error(message);
  }
}
