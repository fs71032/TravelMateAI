export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  userEmail?: string;
  isRead?: boolean;
  createdAt: string;
};

import { authFetch } from './api';
import { getNotificationSocket } from './socket';

export async function fetchNotifications(userEmail?: string): Promise<Notification[]> {
  const query = userEmail ? `?userEmail=${encodeURIComponent(userEmail)}` : '';
  const response = await authFetch(`/api/notifications${query}`);
  if (!response.ok) {
    throw new Error('Failed to load notifications.');
  }
  return response.json();
}

export async function markNotificationRead(id: string, isRead = true): Promise<Notification> {
  const response = await authFetch(`/api/notifications/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_read: isRead })
  });

  if (!response.ok) {
    throw new Error('Unable to update notification.');
  }

  return response.json();
}

export async function deleteNotification(id: string): Promise<void> {
  const response = await authFetch(`/api/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  if (!response.ok && response.status !== 204) {
    throw new Error('Unable to delete notification.');
  }
}

export function subscribeToNotifications(
  userEmail: string,
  onNotification: (notification: Notification) => void
): () => void {
  const socket = getNotificationSocket();
  const handler = (notification: Notification) => {
    if (!notification.userEmail || notification.userEmail.toLowerCase() === userEmail.toLowerCase()) {
      onNotification(notification);
    }
  };
  socket.on('notification', handler);
  return () => {
    socket.off('notification', handler);
  };
}

export async function listenForNotifications(
  onNotification: (notification: Notification) => void
) {
  const socket = getNotificationSocket();
  socket.on('notification', onNotification);
  return () => socket.off('notification', onNotification);
}

export async function createNotification(notification: {
  type: string;
  title: string;
  message: string;
  userEmail?: string;
}): Promise<Notification> {
  const response = await authFetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notification)
  });

  if (!response.ok) {
    throw new Error('Unable to create notification.');
  }

  return response.json();
}
