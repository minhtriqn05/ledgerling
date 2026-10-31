import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RETRY_AFTER_CLOSED_MS, SocketProvider, useLiveStatus, useSocketEvent } from './SocketContext.jsx';
import { useAuth } from './AuthContext.jsx';

// A stand-in for the socket: the test plays the server by calling fire()
const sockets = [];
vi.mock('socket.io-client', () => ({
  io: vi.fn((address, options) => {
    const handlers = {};
    const socket = {
      address,
      options,
      id: `socket-${sockets.length + 1}`,
      active: true,
      on: (event, handler) => {
        handlers[event] = handler;
      },
      fire: (event, payload) => handlers[event]?.(payload),
      connect: vi.fn(),
      close: vi.fn(),
    };
    sockets.push(socket);
    return socket;
  }),
}));
vi.mock('./AuthContext.jsx', () => ({ useAuth: vi.fn() }));

const logout = vi.fn();

function Listener({ onEvent }) {
  useSocketEvent('data:changed', (payload) => onEvent('data:changed', payload));
  useSocketEvent('reconnected', () => onEvent('reconnected'));
  return <span>{useLiveStatus()}</span>;
}

function renderProvider(onEvent = vi.fn()) {
  return render(
    <SocketProvider>
      <Listener onEvent={onEvent} />
    </SocketProvider>
  );
}

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'http://api.test:4000/api');
  localStorage.setItem('token', 'token-1');
  useAuth.mockReturnValue({ token: 'token-1', logout });
});

afterEach(() => {
  sockets.length = 0;
  logout.mockClear();
  localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('SocketProvider', () => {
  it('connects to the server (not to /api) with the token', () => {
    renderProvider();
    expect(sockets).toHaveLength(1);
    expect(sockets[0].address).toBe('http://api.test:4000');
    expect(sockets[0].options.auth).toEqual({ token: 'token-1' });
  });

  it('does not connect without a token', () => {
    useAuth.mockReturnValue({ token: null, logout });
    renderProvider();
    expect(sockets).toHaveLength(0);
  });

  it('closes the socket when the component goes away (logout)', () => {
    const { unmount } = renderProvider();
    unmount();
    expect(sockets[0].close).toHaveBeenCalled();
  });

  it('opens a new socket for a new token', () => {
    const { rerender } = renderProvider();
    useAuth.mockReturnValue({ token: 'token-2', logout });
    rerender(
      <SocketProvider>
        <span />
      </SocketProvider>
    );
    expect(sockets[0].close).toHaveBeenCalled();
    expect(sockets[1].options.auth).toEqual({ token: 'token-2' });
  });

  it('shows the status: reconnecting until connected, and again after losing the connection', () => {
    renderProvider();
    expect(screen.getByText('reconnecting')).toBeInTheDocument();
    act(() => sockets[0].fire('connect'));
    expect(screen.getByText('live')).toBeInTheDocument();
    act(() => sockets[0].fire('disconnect', 'transport close'));
    expect(screen.getByText('reconnecting')).toBeInTheDocument();
  });

  it('passes on the events of the server', () => {
    const onEvent = vi.fn();
    renderProvider(onEvent);
    act(() => sockets[0].fire('data:changed', { resource: 'goals' }));
    expect(onEvent).toHaveBeenCalledWith('data:changed', { resource: 'goals' });
  });

  it('says "reconnected" after a lost connection came back, not on the first connection', () => {
    const onEvent = vi.fn();
    renderProvider(onEvent);
    act(() => sockets[0].fire('connect'));
    expect(onEvent).not.toHaveBeenCalled();
    act(() => sockets[0].fire('disconnect', 'transport close'));
    act(() => sockets[0].fire('connect'));
    expect(onEvent).toHaveBeenCalledWith('reconnected');
  });

  it('logs out when the server refuses the token of this session', () => {
    renderProvider();
    act(() => sockets[0].fire('connect_error', new Error('TOKEN_INVALID')));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('does not log out when the refused token was already replaced on this device', () => {
    renderProvider();
    localStorage.setItem('token', 'token-2');
    act(() => sockets[0].fire('connect_error', new Error('TOKEN_INVALID')));
    expect(logout).not.toHaveBeenCalled();
  });

  it('does not log out on a network problem', () => {
    renderProvider();
    act(() => sockets[0].fire('connect_error', new Error('xhr poll error')));
    expect(logout).not.toHaveBeenCalled();
  });

  it('asks again after the server closed the socket, unless a new token replaced it first', () => {
    vi.useFakeTimers();
    const { rerender } = renderProvider();
    act(() => sockets[0].fire('disconnect', 'io server disconnect'));
    act(() => vi.advanceTimersByTime(RETRY_AFTER_CLOSED_MS));
    expect(sockets[0].connect).toHaveBeenCalledTimes(1);

    act(() => sockets[0].fire('disconnect', 'io server disconnect'));
    useAuth.mockReturnValue({ token: 'token-2', logout });
    rerender(
      <SocketProvider>
        <span />
      </SocketProvider>
    );
    act(() => vi.advanceTimersByTime(RETRY_AFTER_CLOSED_MS));
    expect(sockets[0].connect).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a provider', () => {
    render(<Listener onEvent={vi.fn()} />);
    expect(screen.getByText('reconnecting')).toBeInTheDocument();
  });
});
