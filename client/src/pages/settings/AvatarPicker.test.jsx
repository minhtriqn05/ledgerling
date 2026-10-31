import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvatarPicker from './AvatarPicker.jsx';
import { removeAvatar, setAvatar } from '../../api/users.js';

vi.mock('../../api/users.js', () => ({ setAvatar: vi.fn(), removeAvatar: vi.fn() }));
vi.mock('../../api/axios.js', () => ({
  getErrorMessage: (error) => error.response?.data?.message ?? 'Cannot reach the server.',
}));
const auth = vi.hoisted(() => ({ user: null, updateUser: vi.fn() }));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => auth }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => toast }));

beforeEach(() => {
  setAvatar.mockReset();
  removeAvatar.mockReset();
  auth.updateUser.mockReset();
  toast.success.mockReset();
  auth.user = { _id: 'u1', name: 'Tri', email: 'tri@example.com', avatar: { type: 'preset', value: 'cat' } };
});

describe('AvatarPicker', () => {
  it('opens on the tab of the avatar the user has, with the four groups as tabs', () => {
    auth.user.avatar = { type: 'preset', value: 'cupcake' };
    render(<AvatarPicker />);

    const tabs = screen.getByRole('group', { name: 'Avatar groups' });
    for (const name of ['Animals', 'Food', 'Nature', 'Fun']) {
      expect(tabs).toContainElement(screen.getByRole('button', { name }));
    }
    expect(screen.getByRole('button', { name: 'Food' })).toHaveAttribute('aria-pressed', 'true');
    // Eight avatars in the tab, the one the user has is checked
    expect(screen.getAllByRole('radio')).toHaveLength(8);
    expect(screen.getByRole('radio', { name: 'Cupcake' })).toBeChecked();
  });

  it('changes the tab', async () => {
    const user = userEvent.setup();
    render(<AvatarPicker />);

    await user.click(screen.getByRole('button', { name: 'Fun' }));
    expect(screen.getByRole('radio', { name: 'Robot' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Cat' })).not.toBeInTheDocument();
  });

  it('saves a ready-made avatar as soon as it is clicked, and puts the user in place', async () => {
    const user = userEvent.setup();
    const saved = { ...auth.user, avatar: { type: 'preset', value: 'fox' } };
    setAvatar.mockResolvedValue(saved);
    render(<AvatarPicker />);

    await user.click(screen.getByRole('radio', { name: 'Fox' }));

    expect(setAvatar).toHaveBeenCalledWith({ type: 'preset', value: 'fox' });
    await waitFor(() => expect(auth.updateUser).toHaveBeenCalledWith(saved));
    expect(toast.success).toHaveBeenCalledWith('Avatar updated');
  });

  it('shows the error when the avatar cannot be saved, and keeps the old one', async () => {
    const user = userEvent.setup();
    setAvatar.mockRejectedValue({ response: { data: { message: 'That avatar does not exist.' } } });
    render(<AvatarPicker />);

    await user.click(screen.getByRole('radio', { name: 'Fox' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That avatar does not exist.');
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Cat' })).toBeChecked();
  });

  it('removes the avatar, and the Remove button is off when there is none', async () => {
    const user = userEvent.setup();
    const removed = { ...auth.user, avatar: undefined };
    removeAvatar.mockResolvedValue(removed);
    const { unmount } = render(<AvatarPicker />);

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(removeAvatar).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(auth.updateUser).toHaveBeenCalledWith(removed));
    unmount();

    auth.user = removed;
    render(<AvatarPicker />);
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
  });

  it('refuses a file that is not a JPG, PNG or WebP image, before anything is sent', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<AvatarPicker />);

    await user.upload(screen.getByTestId('avatar-file'), new File(['GIF89a'], 'cat.gif', { type: 'image/gif' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPG, PNG or WebP image.');
    expect(setAvatar).not.toHaveBeenCalled();
  });

  it('refuses a photo over 12 MB', async () => {
    const user = userEvent.setup();
    render(<AvatarPicker />);
    const big = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 13 * 1024 * 1024 });

    await user.upload(screen.getByTestId('avatar-file'), big);

    expect(await screen.findByRole('alert')).toHaveTextContent('too big');
  });

  it('for the demo account shows the avatar and a note, but no way to change it', () => {
    auth.user = { ...auth.user, isDemo: true };
    render(<AvatarPicker />);

    expect(screen.getByText('The demo account keeps one fixed avatar.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload photo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });
});
