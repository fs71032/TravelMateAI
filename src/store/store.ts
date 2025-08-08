import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice';
import notificationsReducer from './notificationsSlice';
import searchReducer from './searchSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    notifications: notificationsReducer,
    search: searchReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
