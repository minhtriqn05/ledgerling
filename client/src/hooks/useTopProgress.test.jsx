import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTE_PULSE_MS, SHOW_AFTER_MS, useTopProgress } from './useTopProgress.js';
import { getActiveRequests, requestFinished, requestStarted } from '../utils/requestTracker.js';

const wait = (ms) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  while (getActiveRequests() > 0) requestFinished();
  vi.useRealTimers();
});

describe('useTopProgress', () => {
  it('shows for a moment after the address changed, then goes away', () => {
    const { result, rerender } = renderHook(({ path }) => useTopProgress(path), { initialProps: { path: '/' } });
    wait(ROUTE_PULSE_MS + SHOW_AFTER_MS);
    expect(result.current).toBe(false);

    rerender({ path: '/budgets' });
    expect(result.current).toBe(false); // not at once: a quick answer never flickers
    wait(SHOW_AFTER_MS);
    expect(result.current).toBe(true);
    wait(ROUTE_PULSE_MS);
    expect(result.current).toBe(false);
  });

  it('stays while a request is on its way', () => {
    const { result } = renderHook(() => useTopProgress('/'));
    act(() => requestStarted());
    wait(ROUTE_PULSE_MS + SHOW_AFTER_MS + 1000);
    expect(result.current).toBe(true);

    act(() => requestFinished());
    expect(result.current).toBe(false);
  });

  it('waits for the last of several requests', () => {
    const { result } = renderHook(() => useTopProgress('/'));
    act(() => {
      requestStarted();
      requestStarted();
    });
    wait(ROUTE_PULSE_MS + SHOW_AFTER_MS);
    act(() => requestFinished());
    expect(result.current).toBe(true);
    act(() => requestFinished());
    expect(result.current).toBe(false);
  });

  it('never counts below zero', () => {
    requestFinished();
    expect(getActiveRequests()).toBe(0);
  });
});
