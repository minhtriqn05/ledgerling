import { useEffect, useRef } from 'react';
import { useSocketEvent } from '../context/SocketContext.jsx';

export const LIVE_REFRESH_DELAY_MS = 300;

// Loads a page's data again when another device changed it.
//   useLiveRefresh(['transactions', 'categories'], () => setReloadKey((key) => key + 1));
// - resources: what the page shows; a name or a list (the names are in docs/api-plan.md, "Real-time events").
// - refetch must not show a loading state: a person may be typing in a dialog on this page.
// It also runs after a lost connection came back, because the events of that time were missed.
// A burst of changes (a CSV import, a bulk delete) waits for a short quiet moment and gives one refetch.
export function useLiveRefresh(resources, refetch) {
  const timer = useRef(null);
  const latest = useRef(refetch);
  useEffect(() => {
    latest.current = refetch;
  });

  function schedule() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current(), LIVE_REFRESH_DELAY_MS);
  }

  useSocketEvent('data:changed', ({ resource }) => {
    if ([].concat(resources).includes(resource)) schedule();
  });
  useSocketEvent('reconnected', schedule);

  useEffect(() => () => clearTimeout(timer.current), []);
}
