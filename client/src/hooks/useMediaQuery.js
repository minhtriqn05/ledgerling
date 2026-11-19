import { useEffect, useState } from 'react';

// The width where the sidebar becomes a top bar (the same number as the media queries in AppLayout.module.css)
export const NARROW_SCREEN = '(max-width: 767px)';

// A tablet: the top bar has the sidebar next to it, and with the sidebar open the search, the theme switch and the bell
// leave 100-200px for the breadcrumb, too little for a trail of two levels in some languages up to about 935px
// (AppLayout puts it above the page there)
export const TABLET_SCREEN = '(min-width: 768px) and (max-width: 959px)';

// True while the CSS media query matches, and it follows the window when it changes.
// For the few things CSS cannot do, like showing another component on a phone.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => Boolean(window.matchMedia?.(query).matches));

  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return undefined;
    setMatches(list.matches);
    const handleChange = (event) => setMatches(event.matches);
    list.addEventListener('change', handleChange);
    return () => list.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
