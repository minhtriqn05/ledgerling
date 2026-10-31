import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationSettings from './NotificationSettings.jsx';
import { updateNotificationSettings } from '../../api/notifications.js';
import { useAuth } from '../../context/AuthContext.jsx';

vi.mock('../../api/notifications.js', () => ({ updateNotificationSettings: vi.fn() }));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
// The real toasts need the popover API of a browser, which jsdom does not have
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => toast }));

const updateUser = vi.fn();

function renderSettings(notifications) {
  useAuth.mockReturnValue({ user: { preferences: notifications ? { notifications } : undefined }, updateUser });
  return render(<NotificationSettings />);
}

beforeEach(() => {
  updateNotificationSettings.mockReset();
  updateUser.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

describe('NotificationSettings', () => {
  it('shows one switch per kind, all on for an account without the field', () => {
    renderSettings(undefined);
    const switches = screen.getAllByRole('checkbox');
    expect(switches).toHaveLength(4);
    switches.forEach((box) => expect(box).toBeChecked());
  });

  it('shows the saved choices', () => {
    renderSettings({ budget: false, goals: true, recurring: true, weekly: false });
    expect(screen.getByRole('checkbox', { name: /^Budgets/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /^Savings goals/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /^Weekly summary/ })).not.toBeChecked();
  });

  it('sends only the switch that was clicked, moves it at once and puts the new user in place', async () => {
    const saved = { preferences: { notifications: { budget: false, goals: true, recurring: true, weekly: true } } };
    // The answer comes later, so the switch has to move before it
    let answer;
    updateNotificationSettings.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    renderSettings({ budget: true, goals: true, recurring: true, weekly: true });

    await userEvent.click(screen.getByRole('checkbox', { name: /^Budgets/ }));

    expect(screen.getByRole('checkbox', { name: /^Budgets/ })).not.toBeChecked();
    expect(updateNotificationSettings).toHaveBeenCalledWith({ budget: false });
    answer(saved);
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(saved));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Settings saved'));
  });

  it('moves the switch back and shows the error when the server refuses', async () => {
    updateNotificationSettings.mockRejectedValue({});
    renderSettings({ budget: true, goals: true, recurring: true, weekly: true });

    await userEvent.click(screen.getByRole('checkbox', { name: /^Budgets/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Cannot reach the server. Please try again.'));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /^Budgets/ })).toBeChecked());
    expect(updateUser).not.toHaveBeenCalled();
  });
});
