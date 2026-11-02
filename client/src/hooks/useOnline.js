import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

// A browser can change navigator.onLine without firing the event (Firefox does it for a page that was loaded while
// offline), so the value is also looked at every 2 seconds. One watcher serves every component that uses the hook.
const CHECK_EVERY_MS = 2000;
const listeners = new Set();
let lastSeen;
let timer;

function check() {
  if (navigator.onLine === lastSeen) return;
  lastSeen = navigator.onLine;
  listeners.forEach((listener) => listener());
}

function subscribe(onChange) {
  if (listeners.size === 0) {
    lastSeen = navigator.onLine;
    window.addEventListener('online', check);
    window.addEventListener('offline', check);
    timer = setInterval(check, CHECK_EVERY_MS);
  }
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
    if (listeners.size > 0) return;
    window.removeEventListener('online', check);
    window.removeEventListener('offline', check);
    clearInterval(timer);
  };
}

// True while the browser has a network. The value stays right everywhere, with no provider around the app.
export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine);
}

// For a control that writes to the API: it is locked while offline, with a note saying why.
//   const { locked, note } = useOfflineLock();
//   <button disabled={saving || locked} title={note}>
// Button and IconButton do this by themselves with the prop needsNetwork.
export function useOfflineLock(needed = true) {
  const { t } = useTranslation();
  const online = useOnline();
  const locked = needed && !online;
  return { locked, note: locked ? t('offline.locked') : undefined };
}
