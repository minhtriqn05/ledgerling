import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminRoute from './AdminRoute.jsx';

let mockUser = null;
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: mockUser }) }));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>Dashboard page</p>} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<p>Admin page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminRoute', () => {
  it('shows the page to an admin', () => {
    mockUser = { _id: '1', role: 'admin' };
    renderAt('/admin');
    expect(screen.getByText('Admin page')).toBeInTheDocument();
  });

  it('sends a normal user to the Dashboard', () => {
    mockUser = { _id: '2', role: 'user' };
    renderAt('/admin');
    expect(screen.queryByText('Admin page')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('sends a user without a role (an old answer of the API) to the Dashboard too', () => {
    mockUser = { _id: '3' };
    renderAt('/admin');
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });
});
