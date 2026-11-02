import { useEffect, useRef } from 'react';

// Gives the focus back to the element that had it when the component appeared (the button that opened a dialog),
// once the component is gone. React removes a <dialog> from the page without closing it, so the browser does not
// do this by itself, and a keyboard user would land at the top of the page. An element that is gone by then is skipped.
export function useRestoreFocus() {
  const opener = useRef(null);
  // Read once, on the first render, before the dialog takes the focus
  if (opener.current === null) opener.current = document.activeElement;

  useEffect(
    () => () => {
      const element = opener.current;
      if (element instanceof HTMLElement && element !== document.body && element.isConnected) element.focus();
    },
    []
  );
}
