import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NotificationBell from './NotificationBell.jsx';
import { NotificationsProvider } from '../../context/NotificationsContext.jsx';
import { getNotifications, getUnreadCount, markAllRead, markRead } from '../../api/notifications.js';

// The real API client sends HTTP requests; here each test decides what the API answers.
vi.mock('../../api/notifications.js', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));

function makeNotification(id, overrides = {}) {
  return {
    _id: id,
    type: 'budget_warning',
    title: `Title ${id}`,
    message: `Message ${id}`,
    link: '/budgets?month=2026-10',
    params: { categoryName: 'Food', month: '2026-10', percent: 85, spent: 850000, amount: 1000000 },
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

function renderBell() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <NotificationsProvider>
        <NotificationBell />
        <Routes>
          <Route path="/" element={<p>Home</p>} />
          <Route path="/budgets" element={<p>Budgets page</p>} />
          <Route path="/notifications" element={<p>Notifications page</p>} />
        </Routes>
      </NotificationsProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  getNotifications.mockReset();
  getUnreadCount.mockReset();
  markRead.mockReset().mockResolvedValue({});
  markAllRead.mockReset().mockResolvedValue({ updated: 2 });
});

describe('NotificationBell', () => {
  it('shows the unread number on the bell, and no badge when there is nothing unread', async () => {
    getUnreadCount.mockResolvedValue(3);
    renderBell();
    expect(await screen.findByRole('button', { name: 'Notifications, 3 unread' })).toHaveTextContent('3');
  });

  it('has no badge at zero', async () => {
    getUnreadCount.mockResolvedValue(0);
    renderBell();
    const bell = await screen.findByRole('button', { name: 'Notifications' });
    expect(bell).not.toHaveTextContent(/\d/);
  });

  it('shows 99+ for a very long list', async () => {
    getUnreadCount.mockResolvedValue(250);
    renderBell();
    expect(await screen.findByRole('button', { name: 'Notifications, 250 unread' })).toHaveTextContent('99+');
  });

  it('opens a list with the text in the user\'s language and "2h ago"', async () => {
    getUnreadCount.mockResolvedValue(1);
    getNotifications.mockResolvedValue({ items: [makeNotification('a')], meta: {} });
    renderBell();

    await userEvent.click(await screen.findByRole('button', { name: /^Notifications, 1 unread/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Notifications' });
    expect(await within(dialog).findByText('Budget warning: Food')).toBeInTheDocument();
    expect(within(dialog).getByText(/Food has used 85% of its October 2026 budget/)).toBeInTheDocument();
    expect(within(dialog).getByText('2h ago')).toBeInTheDocument();
    expect(getNotifications).toHaveBeenCalledWith({ limit: 8 });
  });

  it('marks a notification as read and goes to its link when it is clicked', async () => {
    getUnreadCount.mockResolvedValue(2);
    const transport = { categoryName: 'Transport', month: '2026-10', percent: 90, spent: 900000, amount: 1000000 };
    getNotifications.mockResolvedValue({
      items: [makeNotification('a'), makeNotification('b', { read: true, params: transport })],
      meta: {},
    });
    renderBell();

    await userEvent.click(await screen.findByRole('button', { name: /^Notifications, 2 unread/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Budget warning: Food/ }));

    expect(markRead).toHaveBeenCalledWith('a');
    expect(await screen.findByText('Budgets page')).toBeInTheDocument();
    // The bell went from 2 to 1 without asking the API again
    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
  });

  it('does not mark an already read notification again', async () => {
    getUnreadCount.mockResolvedValue(0);
    getNotifications.mockResolvedValue({ items: [makeNotification('b', { read: true })], meta: {} });
    renderBell();

    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    await userEvent.click(await screen.findByRole('button', { name: /Budget warning: Food/ }));

    expect(markRead).not.toHaveBeenCalled();
    expect(await screen.findByText('Budgets page')).toBeInTheDocument();
  });

  it('marks everything as read with one button', async () => {
    getUnreadCount.mockResolvedValue(2);
    getNotifications.mockResolvedValue({ items: [makeNotification('a'), makeNotification('b')], meta: {} });
    renderBell();

    await userEvent.click(await screen.findByRole('button', { name: /^Notifications, 2 unread/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }));

    expect(markAllRead).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Notifications' })).not.toHaveTextContent(/\d/));
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
  });

  it('shows a friendly text when there are no notifications', async () => {
    getUnreadCount.mockResolvedValue(0);
    getNotifications.mockResolvedValue({ items: [], meta: {} });
    renderBell();

    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
  });

  it('shows the error when the list cannot be loaded', async () => {
    getUnreadCount.mockResolvedValue(0);
    getNotifications.mockRejectedValue({});
    renderBell();

    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
  });

  it('goes to the Notifications page from "View all notifications"', async () => {
    getUnreadCount.mockResolvedValue(0);
    getNotifications.mockResolvedValue({ items: [], meta: {} });
    renderBell();

    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    await userEvent.click(await screen.findByRole('button', { name: 'View all notifications' }));
    expect(await screen.findByText('Notifications page')).toBeInTheDocument();
  });

  it('asks for the number again when data was changed somewhere in the app', async () => {
    getUnreadCount.mockResolvedValueOnce(0).mockResolvedValue(1);
    renderBell();
    await screen.findByRole('button', { name: 'Notifications' });

    window.dispatchEvent(new Event('ledgerling:data-changed'));
    expect(await screen.findByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
  });
});
