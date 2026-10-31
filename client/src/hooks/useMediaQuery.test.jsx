import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from './useMediaQuery.js';

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

function fakeMedia(matches) {
  const listeners = new Set();
  const list = {
    matches,
    addEventListener: (_type, handler) => listeners.add(handler),
    removeEventListener: (_type, handler) => listeners.delete(handler),
    fire: (next) => listeners.forEach((handler) => handler({ matches: next })),
    listeners,
  };
  window.matchMedia = vi.fn(() => list);
  return list;
}

describe('useMediaQuery', () => {
  it('starts with what the browser says', () => {
    fakeMedia(true);
    expect(renderHook(() => useMediaQuery('(max-width: 767px)')).result.current).toBe(true);
    fakeMedia(false);
    expect(renderHook(() => useMediaQuery('(max-width: 767px)')).result.current).toBe(false);
  });

  it('follows the window and stops listening when it is gone', () => {
    const list = fakeMedia(false);
    const { result, unmount } = renderHook(() => useMediaQuery('(max-width: 767px)'));

    act(() => list.fire(true));
    expect(result.current).toBe(true);

    unmount();
    expect(list.listeners.size).toBe(0);
  });

  it('is false in a browser without matchMedia', () => {
    window.matchMedia = undefined;
    expect(renderHook(() => useMediaQuery('(max-width: 767px)')).result.current).toBe(false);
  });
});
