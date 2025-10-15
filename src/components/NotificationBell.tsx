import { useState } from 'react';
import {
  deleteNotification,
  fetchNotifications,
  markNotificationRead
} from '../services/notificationService';
import { formatDisplayDateTime } from '../utils/dateFormat';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  markAllNotificationsReadLocal,
  markNotificationReadLocal,
  removeNotificationLocal,
  selectNotifications,
  selectNotificationsLoading,
  selectUnreadCount,
  setNotifications,
  setNotificationsLoading
} from '../store/notificationsSlice';

interface NotificationBellProps {
  userEmail?: string;
}

export function NotificationBell({ userEmail }: NotificationBellProps) {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const isLoading = useAppSelector(selectNotificationsLoading);
  const unreadCount = useAppSelector(selectUnreadCount);
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkRead = (id: string) => {
    dispatch(markNotificationReadLocal(id));
    markNotificationRead(id, true).catch(() => {
      dispatch(markNotificationReadLocal(id));
    });
  };

  const handleDismiss = (id: string) => {
    dispatch(removeNotificationLocal(id));
    deleteNotification(id).catch(() => {
      if (userEmail) {
        fetchNotifications(userEmail).then((data) => dispatch(setNotifications(data))).catch(() => {});
      }
    });
  };

  const handleMarkAllRead = () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (!unread.length) return;
    dispatch(markAllNotificationsReadLocal());
    Promise.allSettled(unread.map((n) => markNotificationRead(n.id, true)));
  };

  const handleClearAll = () => {
    if (!notifications.length) return;
    const toClear = notifications;
    dispatch(setNotifications([]));
    Promise.allSettled(toClear.map((n) => deleteNotification(n.id)));
  };

  const handleRefresh = () => {
    if (!userEmail) return;
    dispatch(setNotificationsLoading(true));
    fetchNotifications(userEmail)
      .then((data) => dispatch(setNotifications(data)))
      .catch(() => dispatch(setNotifications([])))
      .finally(() => dispatch(setNotificationsLoading(false)));
  };

  if (!userEmail) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-cyan-400"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center rounded-full bg-cyan-500 text-xs font-semibold text-white w-5 h-5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}