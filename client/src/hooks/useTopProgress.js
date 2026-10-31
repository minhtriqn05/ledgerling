import { useEffect, useState, useSyncExternalStore } from 'react';
import { getActiveRequests, subscribeToRequests } from '../utils/requestTracker.js';

// A page change shows the bar this long, even when the new page has nothing to load
export const ROUTE_PULSE_MS = 300;
// Anything shorter does not show the bar at all, so a quick answer never makes it flicker
export const SHOW_AFTER_MS = 120;

// True while the thin bar at the top of the page should show: right after the address changed, or while requests are on their way.
export function useTopProgress(pathname) {
  const active = useSyncExternalStore(subscribeToRequests, getActiveRequests);
  const [pulsing, setPulsing] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setPulsing(true);
    const timer = setTimeout(() => setPulsing(false), ROUTE_PULSE_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  const busy = active > 0 || pulsing;

  useEffect(() => {
    if (!busy) {
      setVisible(false);
      return undefined;
    }
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [busy]);

  return visible;
}
