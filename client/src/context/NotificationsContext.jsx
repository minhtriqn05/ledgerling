import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DATA_CHANGED_EVENT } from '../api/axios.js';
import { getUnreadCount } from '../api/notifications.js';

// The number on the bell. It asks the API every minute while the tab is open, when the tab is shown again, and
// after every request that changed data (a transaction was added, a goal was funded...), because the server may
// have created a notification because of it.

const NotificationsContext = createContext(null);

export const POLL_INTERVAL_MS = 60 * 1000;

export function NotificationsProvider({ children }) {
  const [unread, setUnreadState] = useState(0);
  // Counts the changes of `unread`. An answer that arrives after a newer change (or a newer request) is outdated.
  const version = useRef(0);

  const refreshUnread = useCallback(() => {
    const mine = ++version.current;
    return getUnreadCount()
      .then((count) => {
        if (mine === version.current) setUnreadState(count);
      })
      .catch(() => {}); // a missed poll is not worth an error message, the next one will fix it
  }, []);

  // The page already knows the new number (it just marked something as read): use it and drop pending answers
  const setUnread = useCallback((update) => {
    version.current += 1;
    setUnreadState(update);
  }, []);

  useEffect(() => {
    refreshUnread();

    function refreshIfVisible() {
      if (document.visibilityState === 'visible') refreshUnread();
    }
    const timer = setInterval(refreshIfVisible, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener(DATA_CHANGED_EVENT, refreshUnread);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener(DATA_CHANGED_EVENT, refreshUnread);
    };
  }, [refreshUnread]);

  const value = useMemo(() => ({ unread, setUnread, refreshUnread }), [unread, setUnread, refreshUnread]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

// Usage: const { unread, setUnread, refreshUnread } = useNotifications();
export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return context;
}
