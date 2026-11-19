import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/transactions" element={<p>Transactions page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute while the server does not answer', () => {
  it('waits for the server instead of sending a signed-in person to /login', async () => {
    const retryCheck = vi.fn();
    useAuth.mockReturnValue({ user: null, loading: false, unreachable: true, retryCheck });
    renderAt('/transactions');
    expect(screen.getByRole('heading', { level: 1, name: 'Waiting for the server' })).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retryCheck).toHaveBeenCalledTimes(1);
  });

  it('tells the person that the server is waking up when the check takes long', async () => {
    vi.useFakeTimers();
    useAuth.mockReturnValue({ user: null, loading: true });
    renderAt('/transactions');
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByRole('status')).toHaveTextContent('Starting the server, this can take up to a minute…');
    vi.useRealTimers();
  });
});
