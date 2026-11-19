import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { usePauseOffscreen } from './usePauseOffscreen.js';

function Decoration() {
  const ref = useRef(null);
  usePauseOffscreen(ref);
  return <span ref={ref} data-testid="decoration" />;
}

// jsdom has no IntersectionObserver: this one remembers what it watches, and the test says when it is in the window
function stubObserver() {
  const observers = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback) {
        this.callback = callback;
        this.observe = vi.fn((element) => (this.element = element));
        this.disconnect = vi.fn();
        observers.push(this);
      }
    },
  );
  return observers;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePauseOffscreen', () => {
  it('marks the element while it is out of the window, and unmarks it when it comes back', () => {
    const observers = stubObserver();
    render(<Decoration />);
    const element = screen.getByTestId('decoration');
    expect(observers).toHaveLength(1);
    expect(observers[0].element).toBe(element);
    expect(element).not.toHaveAttribute('data-offscreen');

    observers[0].callback([{ isIntersecting: false }]);
    expect(element).toHaveAttribute('data-offscreen');

    observers[0].callback([{ isIntersecting: true }]);
    expect(element).not.toHaveAttribute('data-offscreen');
  });

  it('stops watching when the element is gone, and leaves it unmarked', () => {
    const observers = stubObserver();
    const { unmount } = render(<Decoration />);
    const element = screen.getByTestId('decoration');
    observers[0].callback([{ isIntersecting: false }]);

    unmount();
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(element).not.toHaveAttribute('data-offscreen');
  });

  it('does nothing in a browser without IntersectionObserver: the decoration keeps moving', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Decoration />);
    expect(screen.getByTestId('decoration')).not.toHaveAttribute('data-offscreen');
  });
});
