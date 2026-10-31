import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DangerSection from './DangerSection.jsx';
import { deleteAccount } from '../../api/users.js';

vi.mock('../../api/users.js', () => ({ deleteAccount: vi.fn() }));
vi.mock('../../api/axios.js', () => ({
  getErrorMessage: (error) => error.response?.data?.message ?? 'Cannot reach the server.',
}));
const logout = vi.fn();
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ logout }) }));
// The real toasts need the popover API of a browser, which jsdom does not have
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => toast }));

function renderSection() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/settings" element={<DangerSection />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

const deleteButton = () => screen.getByRole('button', { name: 'Delete my account' });

beforeEach(() => {
  deleteAccount.mockReset();
  logout.mockReset();
  toast.success.mockReset();
});

describe('DangerSection', () => {
  it('keeps the button off until DELETE is typed and a password is entered', async () => {
    const user = userEvent.setup();
    renderSection();
    expect(deleteButton()).toBeDisabled();

    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
    expect(deleteButton()).toBeDisabled(); // no password yet

    await user.type(screen.getByLabelText('Your password'), 'secret123');
    expect(deleteButton()).toBeEnabled();
  });

  it('wants the word in capitals, exactly', async () => {
    const user = userEvent.setup();
    renderSection();
    await user.type(screen.getByLabelText('Your password'), 'secret123');

    for (const wrong of ['delete', 'Delete', 'DELET', 'DELETE ', ' DELETE']) {
      const field = screen.getByLabelText('Type DELETE to confirm');
      await user.clear(field);
      await user.type(field, wrong);
      expect(deleteButton(), wrong).toBeDisabled();
    }
    await user.clear(screen.getByLabelText('Type DELETE to confirm'));
    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
    expect(deleteButton()).toBeEnabled();
  });

  it('deletes with the password, logs out and goes to the login page', async () => {
    const user = userEvent.setup();
    deleteAccount.mockResolvedValue();
    renderSection();

    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
    await user.type(screen.getByLabelText('Your password'), 'secret123');
    await user.click(deleteButton());

    expect(deleteAccount).toHaveBeenCalledWith('secret123');
    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Your account was deleted.');
  });

  it('shows the error and stays signed in when the password is wrong', async () => {
    const user = userEvent.setup();
    deleteAccount.mockRejectedValue({ response: { data: { message: 'The password is incorrect' } } });
    renderSection();

    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
    await user.type(screen.getByLabelText('Your password'), 'nope');
    await user.click(deleteButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('The password is incorrect');
    expect(logout).not.toHaveBeenCalled();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    // The button works again for another try
    await waitFor(() => expect(deleteButton()).toBeEnabled());
  });
});
