import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOUR_START_DELAY_MS, useTour } from './useTour.js';
import { TOUR_SEEN_KEY } from '../utils/tour.js';

const waitForStart = () => act(() => vi.advanceTimersByTime(TOUR_START_DELAY_MS));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('useTour', () => {
  it('starts by itself the first time, after a moment', () => {
    const { result } = renderHook(() => useTour());
    expect(result.current.open).toBe(false);
    waitForStart();
    expect(result.current.open).toBe(true);
  });

  it('remembers it after Skip or Done, and does not start again', () => {
    const first = renderHook(() => useTour());
    waitForStart();
    act(() => first.result.current.finish());
    expect(first.result.current.open).toBe(false);
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe('1');
    first.unmount();

    const again = renderHook(() => useTour());
    waitForStart();
    expect(again.result.current.open).toBe(false);
  });

  it('comes back when it is asked for', () => {
    localStorage.setItem(TOUR_SEEN_KEY, '1');
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    expect(result.current.open).toBe(true);
  });

  it('starts again on the next visit when it was left open (a reload in the middle)', () => {
    const first = renderHook(() => useTour());
    waitForStart();
    first.unmount();

    const again = renderHook(() => useTour());
    waitForStart();
    expect(again.result.current.open).toBe(true);
  });

  it('does not start over a dialog that is already open', () => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.appendChild(dialog);

    const { result } = renderHook(() => useTour());
    waitForStart();
    expect(result.current.open).toBe(false);
  });
});
