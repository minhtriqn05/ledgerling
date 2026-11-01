import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useSpotlight } from './useSpotlight.js';

function Page() {
  useSpotlight();
  return (
    <div data-spot data-testid="card">
      <p data-testid="inside">Text</p>
    </div>
  );
}

const originalMatchMedia = window.matchMedia;

function setMedia(matches) {
  window.matchMedia = (query) => ({ matches, media: query, addEventListener: () => {}, removeEventListener: () => {} });
}

beforeEach(() => {
  // One frame at once, so the test does not have to wait for it
  vi.stubGlobal('requestAnimationFrame', (callback) => {
    callback();
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.unstubAllGlobals();
});

describe('useSpotlight', () => {
  it('tells the card under the mouse where the mouse is, also from an element inside it', () => {
    setMedia(false);
    render(<Page />);
    const card = screen.getByTestId('card');
    card.getBoundingClientRect = () => ({ left: 10, top: 20 });

    fireEvent.pointerMove(screen.getByTestId('inside'), { clientX: 110, clientY: 70 });

    expect(card.style.getPropertyValue('--spot-x')).toBe('100px');
    expect(card.style.getPropertyValue('--spot-y')).toBe('50px');
  });

  it('does nothing with prefers-reduced-motion or on a touch screen', () => {
    setMedia(true);
    render(<Page />);
    fireEvent.pointerMove(screen.getByTestId('inside'), { clientX: 110, clientY: 70 });
    expect(screen.getByTestId('card').style.getPropertyValue('--spot-x')).toBe('');
  });

  it('stops listening when the page is gone', () => {
    setMedia(false);
    const { unmount } = render(<Page />);
    const remove = vi.spyOn(document, 'removeEventListener');
    unmount();
    expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function));
  });
});
