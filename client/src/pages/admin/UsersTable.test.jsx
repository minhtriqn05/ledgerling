import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsersTable from './UsersTable.jsx';
import { getAdminUsers, setUserStatus } from '../../api/admin.js';

vi.mock('../../api/admin.js', () => ({ getAdminUsers: vi.fn(), setUserStatus: vi.fn() }));
vi.mock('../../api/axios.js', () => ({
  getErrorMessage: (error) => error.response?.data?.message ?? 'Cannot reach the server.',
}));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: { _id: 'me', role: 'admin', name: 'Boss' } }) }));
// The real toasts need the popover API of a browser, which jsdom does not have
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => toast }));

const user = (overrides) => ({
  _id: 'u1',
  name: 'Ann Lee',
  email: 'ann@example.com',
  role: 'user',
  status: 'active',
  createdAt: '2026-10-20T03:00:00.000Z',
  transactionCount: 1234,
  ...overrides,
});

const rows = [
  user(),
  user({ _id: 'u2', name: 'Bob Stone', email: 'bob@example.com', status: 'disabled', transactionCount: 0 }),
  user({ _id: 'me', name: 'Boss', email: 'boss@example.com', role: 'admin' }),
  user({ _id: 'a2', name: 'Other Admin', email: 'other@example.com', role: 'admin' }),
];

const page = (users, meta = {}) => ({ users, meta: { page: 1, limit: 10, total: users.length, totalPages: 1, ...meta } });

beforeAll(() => {
  // jsdom has no <dialog> behaviour yet; the Modal only needs showModal to exist
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.open = true;
  };
});

beforeEach(() => {
  getAdminUsers.mockReset();
  setUserStatus.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
  getAdminUsers.mockResolvedValue(page(rows));
});

describe('UsersTable', () => {
  it('lists the accounts with role, status and number of transactions', async () => {
    render(<UsersTable />);
    const annRow = (await screen.findByText('Ann Lee')).closest('tr');
    expect(within(annRow).getByText('ann@example.com')).toBeInTheDocument();
    expect(within(annRow).getByText('Active')).toBeInTheDocument();
    expect(within(annRow).getByText('1,234')).toBeInTheDocument();

    const bobRow = screen.getByText('Bob Stone').closest('tr');
    expect(within(bobRow).getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByText('4 users')).toBeInTheDocument();
  });

  it('offers Disable / Enable for normal users only, never for me or another admin', async () => {
    render(<UsersTable />);
    await screen.findByText('Ann Lee');

    expect(screen.getByRole('button', { name: 'Disable Ann Lee' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable Bob Stone' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Boss/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Other Admin/ })).not.toBeInTheDocument();
    expect(within(screen.getByText('Boss').closest('tr')).getByText('You')).toBeInTheDocument();
  });

  it('asks before disabling, and changes nothing when the dialog is cancelled', async () => {
    const person = userEvent.setup();
    render(<UsersTable />);
    await person.click(await screen.findByRole('button', { name: 'Disable Ann Lee' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Disable this account?')).toBeInTheDocument();
    await person.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(setUserStatus).not.toHaveBeenCalled();
  });

  it('disables after the confirmation, shows a message and loads the list again', async () => {
    const person = userEvent.setup();
    setUserStatus.mockResolvedValue(user({ status: 'disabled' }));
    render(<UsersTable />);
    await person.click(await screen.findByRole('button', { name: 'Disable Ann Lee' }));

    const dialog = await screen.findByRole('dialog');
    await person.click(within(dialog).getByRole('button', { name: 'Disable' }));

    await waitFor(() => expect(setUserStatus).toHaveBeenCalledWith('u1', 'disabled'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Ann Lee was disabled'));
    expect(getAdminUsers).toHaveBeenCalledTimes(2);
  });

  it('enables a disabled account', async () => {
    const person = userEvent.setup();
    setUserStatus.mockResolvedValue(user({ _id: 'u2', status: 'active' }));
    render(<UsersTable />);
    await person.click(await screen.findByRole('button', { name: 'Enable Bob Stone' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Enable this account?')).toBeInTheDocument();
    await person.click(within(dialog).getByRole('button', { name: 'Enable' }));

    await waitFor(() => expect(setUserStatus).toHaveBeenCalledWith('u2', 'active'));
  });

  it('shows the message of the API when the change is refused, and keeps the dialog open', async () => {
    const person = userEvent.setup();
    setUserStatus.mockRejectedValue({ response: { data: { message: 'You cannot disable another admin' } } });
    render(<UsersTable />);
    await person.click(await screen.findByRole('button', { name: 'Disable Ann Lee' }));
    await person.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Disable' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('You cannot disable another admin'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('searches after the typing stopped, starting on the first page', async () => {
    const person = userEvent.setup();
    render(<UsersTable />);
    await screen.findByText('Ann Lee');
    expect(getAdminUsers).toHaveBeenLastCalledWith({ q: '', page: 1 });

    getAdminUsers.mockResolvedValue(page([rows[0]]));
    await person.type(screen.getByLabelText('Search by name or email'), 'ann');

    await waitFor(() => expect(getAdminUsers).toHaveBeenLastCalledWith({ q: 'ann', page: 1 }));
    await waitFor(() => expect(screen.queryByText('Bob Stone')).not.toBeInTheDocument());
    // One request per word, not per letter
    expect(getAdminUsers.mock.calls.filter(([args]) => args.q === 'a' || args.q === 'an')).toHaveLength(0);
  });

  it('says so when nothing matches the search', async () => {
    const person = userEvent.setup();
    render(<UsersTable />);
    await screen.findByText('Ann Lee');

    getAdminUsers.mockResolvedValue(page([], { total: 0, totalPages: 0 }));
    await person.type(screen.getByLabelText('Search by name or email'), 'zzz');

    expect(await screen.findByText('No users found')).toBeInTheDocument();
    expect(screen.getByText('No name or email matches “zzz”.')).toBeInTheDocument();
  });

  it('goes to the next page', async () => {
    const person = userEvent.setup();
    getAdminUsers.mockResolvedValue(page(rows, { total: 25, totalPages: 3 }));
    render(<UsersTable />);
    await screen.findByText('Ann Lee');
    expect(screen.getByText('25 users')).toBeInTheDocument();

    await person.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() => expect(getAdminUsers).toHaveBeenLastCalledWith({ q: '', page: 2 }));
  });

  it('shows the error with a Try again button', async () => {
    const person = userEvent.setup();
    getAdminUsers.mockRejectedValueOnce({ response: { data: { message: 'Internal server error' } } });
    render(<UsersTable />);

    expect(await screen.findByText('Internal server error')).toBeInTheDocument();
    await person.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Ann Lee')).toBeInTheDocument();
  });
});
