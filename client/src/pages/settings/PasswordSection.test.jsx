import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordSection from './PasswordSection.jsx';
import { changePassword } from '../../api/users.js';

vi.mock('../../api/users.js', () => ({ changePassword: vi.fn() }));
vi.mock('../../api/axios.js', () => ({
  getErrorMessage: (error) => error.response?.data?.message ?? 'Cannot reach the server.',
}));
const saveSession = vi.fn();
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ saveSession }) }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => toast }));

const current = () => screen.getByLabelText('Current password');
const next = () => screen.getByLabelText('New password');
const confirm = () => screen.getByLabelText('Repeat new password');
const submit = () => screen.getByRole('button', { name: 'Change password' });

beforeEach(() => {
  changePassword.mockReset();
  saveSession.mockReset();
  toast.success.mockReset();
});

describe('PasswordSection', () => {
  it('shows the strength of the new password as it is typed', async () => {
    const user = userEvent.setup();
    render(<PasswordSection />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await user.type(next(), 'abc');
    expect(screen.getByRole('status')).toHaveTextContent('Password strength: Weak');

    await user.clear(next());
    await user.type(next(), 'Password1');
    expect(screen.getByRole('status')).toHaveTextContent('Medium');

    await user.clear(next());
    await user.type(next(), 'Password123!');
    expect(screen.getByRole('status')).toHaveTextContent('Strong');
  });

  it.each([
    ['no current password', '', 'a-better-one', 'a-better-one', 'Please enter your current password.'],
    ['a short new password', 'secret123', 'short', 'short', 'New password must be at least 8 characters.'],
    ['the same password', 'secret123', 'secret123', 'secret123', 'New password must be different from the current one'],
    ['two different new passwords', 'secret123', 'a-better-one', 'a-better-two', "The two new passwords don't match."],
  ])('does not call the server for %s', async (_name, oldPassword, newPassword, repeat, message) => {
    const user = userEvent.setup();
    render(<PasswordSection />);
    if (oldPassword) await user.type(current(), oldPassword);
    await user.type(next(), newPassword);
    await user.type(confirm(), repeat);
    await user.click(submit());

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('stores the new token the server sends and empties the form', async () => {
    const user = userEvent.setup();
    const session = { token: 'new-token', user: { name: 'A' } };
    changePassword.mockResolvedValue(session);
    render(<PasswordSection />);

    await user.type(current(), 'secret123');
    await user.type(next(), 'a-better-one');
    await user.type(confirm(), 'a-better-one');
    await user.click(submit());

    expect(changePassword).toHaveBeenCalledWith('secret123', 'a-better-one');
    expect(saveSession).toHaveBeenCalledWith(session);
    expect(toast.success).toHaveBeenCalledWith('Password changed. Other devices were logged out.');
    expect(current()).toHaveValue('');
    expect(next()).toHaveValue('');
    expect(confirm()).toHaveValue('');
  });

  it('shows the server error (a wrong current password) and keeps what was typed', async () => {
    const user = userEvent.setup();
    changePassword.mockRejectedValue({ response: { data: { message: 'The password is incorrect' } } });
    render(<PasswordSection />);

    await user.type(current(), 'wrong');
    await user.type(next(), 'a-better-one');
    await user.type(confirm(), 'a-better-one');
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('The password is incorrect');
    expect(saveSession).not.toHaveBeenCalled();
    expect(next()).toHaveValue('a-better-one');
  });
});
