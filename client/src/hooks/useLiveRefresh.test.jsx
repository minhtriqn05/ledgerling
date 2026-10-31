import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIVE_REFRESH_DELAY_MS, useLiveRefresh } from './useLiveRefresh.js';
import { useSocketEvent } from '../context/SocketContext.jsx';

// The stand-in keeps the handlers, so a test can play the socket
const handlers = {};
vi.mock('../context/SocketContext.jsx', () => ({ useSocketEvent: vi.fn() }));

function Page({ resources, refetch }) {
  useLiveRefresh(resources, refetch);
  return null;
}

function fire(event, payload) {
  act(() => handlers[event](payload));
}

beforeEach(() => {
  vi.useFakeTimers();
  useSocketEvent.mockImplementation((event, handler) => {
    handlers[event] = handler;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useLiveRefresh', () => {
  it('refetches after a change of its resource', () => {
    const refetch = vi.fn();
    render(<Page resources="transactions" refetch={refetch} />);
    fire('data:changed', { resource: 'transactions' });
    expect(refetch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(LIVE_REFRESH_DELAY_MS));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('takes a list of resources and ignores the others', () => {
    const refetch = vi.fn();
    render(<Page resources={['budgets', 'goals']} refetch={refetch} />);
    fire('data:changed', { resource: 'templates' });
    act(() => vi.advanceTimersByTime(LIVE_REFRESH_DELAY_MS));
    expect(refetch).not.toHaveBeenCalled();
    fire('data:changed', { resource: 'goals' });
    act(() => vi.advanceTimersByTime(LIVE_REFRESH_DELAY_MS));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('gives one refetch for a burst of changes', () => {
    const refetch = vi.fn();
    render(<Page resources="transactions" refetch={refetch} />);
    for (let i = 0; i < 5; i += 1) {
      fire('data:changed', { resource: 'transactions' });
      act(() => vi.advanceTimersByTime(LIVE_REFRESH_DELAY_MS / 2));
    }
    act(() => vi.advanceTimersByTime(LIVE_REFRESH_DELAY_MS));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('refetches after a reconnect, whatever the resource', () => {
    const refetch = vi.fn();
    render(<Page resources="goals" refetch={refetch} />);
    fire('reconnected');
    act(() => vi.advanceTimersByTime(LIVE_REFRESH_DELAY_MS));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('calls the latest refetch, and none after the page was left', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = render(<Page resources="goals" refetch={first} />);
    rerender(<Page resources="goals" refetch={second} />);
    fire('data:changed', { resource: 'goals' });
    act(() => vi.advanceTimersByTime(LIVE_REFRESH_DELAY_MS));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    fire('data:changed', { resource: 'goals' });
    unmount();
    act(() => vi.advanceTimersByTime(LIVE_REFRESH_DELAY_MS));
    expect(second).toHaveBeenCalledTimes(1);
  });
});
