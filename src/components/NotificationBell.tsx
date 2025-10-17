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
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 shadow-xl">
          <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-4 py-3">
            <h3 className="font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="text-xs text-slate-400 transition hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Mark all read
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={notifications.length === 0}
                className="text-xs text-slate-400 transition hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="text-xs text-slate-400 transition hover:text-cyan-300 disabled:opacity-50"
              >
                {isLoading ? 'Updating…' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="space-y-2 p-3">
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`relative rounded-2xl border p-3 pr-8 text-sm transition ${
                    notification.isRead
                      ? 'border-slate-800 bg-slate-900/50'
                      : 'border-cyan-700/60 bg-slate-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleDismiss(notification.id)}
                    aria-label="Dismiss notification"
                    className="absolute right-2 top-2 text-slate-500 transition hover:text-rose-300"
                  >
                    ×
                  </button>
                  <div className="flex items-center gap-2">
                    {!notification.isRead && <span className="h-2 w-2 rounded-full bg-cyan-400" />}
                    <p className="text-xs uppercase tracking-[0.15em] text-cyan-400">{notification.type}</p>
                  </div>
                  <p className="mt-1 font-semibold text-white">{notification.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{notification.message}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-500">{formatDisplayDateTime(notification.createdAt)}</p>
                    {!notification.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notification.id)}
                        className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-slate-400">No notifications</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
