import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

// The real AuthContext talks to the API; here each test decides what useAuth() returns.
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

// Shows where the redirect came from, to check that state.from is kept
function LoginStub() {
  const location = useLocation();
  return <p>Login page (from {location.state?.from?.pathname ?? 'nowhere'})</p>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginStub />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/transactions" element={<p>Transactions page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows the page to a signed-in user', () => {
    useAuth.mockReturnValue({ user: { name: 'Tri' }, loading: false });
    renderAt('/transactions');
    expect(screen.getByText('Transactions page')).toBeInTheDocument();
  });

  it('sends a visitor to /login and remembers the page they wanted', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderAt('/transactions');
    expect(screen.getByText('Login page (from /transactions)')).toBeInTheDocument();
    expect(screen.queryByText('Transactions page')).not.toBeInTheDocument();
  });

  it('waits while a stored token is being checked, without redirecting', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderAt('/transactions');
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByText(/Login page/)).not.toBeInTheDocument();
    expect(screen.queryByText('Transactions page')).not.toBeInTheDocument();
  });
});
