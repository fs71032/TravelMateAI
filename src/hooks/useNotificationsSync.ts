import { useEffect } from 'react';
import {
  clearNotifications,
  prependNotification,
  setNotifications,
  setNotificationsLoading
} from '../store/notificationsSlice';
import { useAppDispatch } from '../store/hooks';
import { fetchNotifications, subscribeToNotifications } from '../services/notificationService';

export function useNotificationsSync(userEmail?: string) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!userEmail) {
      dispatch(clearNotifications());
      return;
    }

    let active = true;

    const load = () => {
      dispatch(setNotificationsLoading(true));
      fetchNotifications(userEmail)
        .then((data) => {
          if (active) dispatch(setNotifications(data));
        })
        .catch(() => {
          if (active) dispatch(clearNotifications());
        })
        .finally(() => {
          if (active) dispatch(setNotificationsLoading(false));
        });
    };

    load();
    const unsubscribe = subscribeToNotifications(userEmail, (notification) => {
      if (!active) return;
      dispatch(prependNotification(notification));
    });

    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [dispatch, userEmail]);
}
