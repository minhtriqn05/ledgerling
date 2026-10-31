import { useEffect, useState } from 'react';
import { TOUR_SEEN_KEY } from '../utils/tour.js';
import { useStoredBoolean } from './useStoredBoolean.js';

// Waits for the first page to settle, so the tour does not start on a half-drawn screen
export const TOUR_START_DELAY_MS = 500;

// When the guided tour is open. The first time somebody signs in on this browser it starts by itself, unless a dialog
// is already open (the Quick add shortcut of the installed app, for example); after Skip or Done it only comes back with start().
export function useTour() {
  const [seen, setSeen] = useStoredBoolean(TOUR_SEEN_KEY);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (seen) return undefined;
    const timer = setTimeout(() => {
      if (!document.querySelector('dialog[open]')) setOpen(true);
    }, TOUR_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [seen]);

  return {
    open,
    start: () => setOpen(true),
    finish: () => {
      setOpen(false);
      setSeen(true);
    },
  };
}
