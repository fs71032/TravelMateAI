import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '../services/notificationService';

interface NotificationsState {
  items: Notification[];
  loading: boolean;
}

const initialState: NotificationsState = {
  items: [],
  loading: false
};

function unreadCount(items: Notification[]) {
  return items.filter((item) => !item.isRead).length;
}

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotificationsLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setNotifications(state, action: PayloadAction<Notification[]>) {
      state.items = action.payload;
    },
    clearNotifications(state) {
      state.items = [];
      state.loading = false;
    },
    prependNotification(state, action: PayloadAction<Notification>) {
      if (state.items.some((item) => item.id === action.payload.id)) return;
      state.items = [action.payload, ...state.items].slice(0, 20);
    },
    markNotificationReadLocal(state, action: PayloadAction<string>) {
      const item = state.items.find((n) => n.id === action.payload);
      if (item) item.isRead = true;
    },
    markAllNotificationsReadLocal(state) {
      state.items.forEach((item) => {
        item.isRead = true;
      });
    },
    removeNotificationLocal(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    }
  }
});

export const {
  setNotificationsLoading,
  setNotifications,
  clearNotifications,
  prependNotification,
  markNotificationReadLocal,
  markAllNotificationsReadLocal,
  removeNotificationLocal
} = notificationsSlice.actions;

export const selectNotifications = (state: { notifications: NotificationsState }) => state.notifications.items;
export const selectNotificationsLoading = (state: { notifications: NotificationsState }) => state.notifications.loading;
export const selectUnreadCount = (state: { notifications: NotificationsState }) => unreadCount(state.notifications.items);

export default notificationsSlice.reducer;
