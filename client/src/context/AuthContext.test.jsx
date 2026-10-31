import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios.js';
import { clearApiCache } from '../utils/apiCache.js';
import { AuthProvider, useAuth } from './AuthContext.jsx';

vi.mock('../api/axios.js', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../utils/apiCache.js', () => ({ clearApiCache: vi.fn() }));

let auth;
function Probe() {
  auth = useAuth();
  return <span>{auth.loading ? 'loading' : auth.user?.name ?? 'nobody'}</span>;
}

function renderAuth() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

const session = (id) => ({ token: `token-${id}`, user: { _id: id, name: `User ${id}` } });

beforeEach(() => {
  localStorage.clear();
  api.get.mockReset();
  api.post.mockReset();
  clearApiCache.mockClear();
});

afterEach(() => {
  localStorage.clear();
});

describe('the session at start-up', () => {
  it('forgets the token on a 401', async () => {
    localStorage.setItem('token', 'old');
    api.get.mockRejectedValue({ response: { status: 401 } });
    renderAuth();
    await screen.findByText('nobody');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('keeps the token when the server cannot be reached (offline)', async () => {
    localStorage.setItem('token', 'mine');
    api.get.mockRejectedValue(new Error('Network Error'));
    renderAuth();
    await screen.findByText('nobody');
    expect(localStorage.getItem('token')).toBe('mine');
  });
});

describe('the saved API answers', () => {
  it('are deleted on logout', async () => {
    renderAuth();
    act(() => auth.saveSession(session('a')));
    clearApiCache.mockClear();
    act(() => auth.logout());
    expect(clearApiCache).toHaveBeenCalledTimes(1);
  });

  it('are deleted when another account signs in', async () => {
    renderAuth();
    localStorage.setItem('ledgerling.cacheOwner', 'a');
    api.post.mockResolvedValue({ data: { data: session('b') } });
    await act(() => auth.login('b@example.com', 'secret123'));
    expect(clearApiCache).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(localStorage.getItem('ledgerling.cacheOwner')).toBe('b'));
  });

  it('stay when the same account gets a new token (log out of all other devices)', async () => {
    renderAuth();
    act(() => auth.saveSession(session('a')));
    clearApiCache.mockClear();
    act(() => auth.saveSession({ ...session('a'), token: 'new-token' }));
    expect(clearApiCache).not.toHaveBeenCalled();
  });
});
