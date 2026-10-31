import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

function subscribe(onChange) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
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
