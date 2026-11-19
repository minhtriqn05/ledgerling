import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios.js';
import { AuthProvider, useAuth } from './AuthContext.jsx';

vi.mock('../api/axios.js', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../utils/apiCache.js', () => ({ clearApiCache: vi.fn() }));

let auth;
function Probe() {
  auth = useAuth();
  if (auth.loading) return <span>loading</span>;
  return <span>{auth.user?.name ?? (auth.unreachable ? 'waiting' : 'nobody')}</span>;
}

const renderAuth = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

// Lets the promises of the mocked request settle
const flush = () => act(async () => {});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  api.get.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('the session check when the server does not answer', () => {
  it('keeps the token, waits, and opens the session by itself once the server answers', async () => {
    localStorage.setItem('token', 'mine');
    api.get
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ data: { data: { _id: 'a', name: 'User a' } } });
    renderAuth();
    await flush();
    expect(screen.getByText('waiting')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe('mine');

    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByText('waiting')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(screen.getByText('User a')).toBeInTheDocument();
    expect(auth.unreachable).toBe(false);
    expect(api.get).toHaveBeenCalledTimes(3);
  });

  it('forgets the token when the server answers 401 at last', async () => {
    localStorage.setItem('token', 'old');
    api.get.mockRejectedValueOnce(new Error('Network Error')).mockRejectedValueOnce({ response: { status: 401 } });
    renderAuth();
    await flush();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByText('nobody')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('does not ask again after another refusal (403)', async () => {
    localStorage.setItem('token', 'mine');
    api.get.mockRejectedValue({ response: { status: 403 } });
    renderAuth();
    await flush();
    await act(() => vi.advanceTimersByTimeAsync(30000));
    expect(screen.getByText('nobody')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('"Try again" asks at once', async () => {
    localStorage.setItem('token', 'mine');
    api.get.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({ data: { data: { _id: 'a', name: 'User a' } } });
    renderAuth();
    await flush();
    expect(screen.getByText('waiting')).toBeInTheDocument();
    act(() => auth.retryCheck());
    await flush();
    expect(screen.getByText('User a')).toBeInTheDocument();
  });
});
