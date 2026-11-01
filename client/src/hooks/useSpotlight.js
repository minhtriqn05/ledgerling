import { useEffect } from 'react';

// The soft light that follows the mouse over a card. One listener for the whole page: it tells the card under the mouse
// where the mouse is, as --spot-x and --spot-y, once per frame. The light itself is CSS (components/Card/Card.module.css).
// Any element with data-spot takes part. Touch screens and prefers-reduced-motion get no light.
export function useSpotlight() {
  useEffect(() => {
    if (window.matchMedia('(hover: none), (prefers-reduced-motion: reduce)').matches) return undefined;

    let frame = 0;
    let latest = null;

    function paint() {
      frame = 0;
      const card = latest.target.closest?.('[data-spot]');
      if (!card) return;
      const box = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', `${latest.clientX - box.left}px`);
      card.style.setProperty('--spot-y', `${latest.clientY - box.top}px`);
    }

    function handleMove(event) {
      latest = event;
      if (!frame) frame = requestAnimationFrame(paint);
    }

    document.addEventListener('pointermove', handleMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', handleMove);
      cancelAnimationFrame(frame);
    };
  }, []);
}
