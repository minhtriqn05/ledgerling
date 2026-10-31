import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getUnreadCount } from '../api/notifications.js';
import { NotificationsProvider, useNotifications } from './NotificationsContext.jsx';
import { useSocketEvent } from './SocketContext.jsx';

vi.mock('../api/notifications.js', () => ({ getUnreadCount: vi.fn() }));
vi.mock('./SocketContext.jsx', () => ({ useSocketEvent: vi.fn() }));

const handlers = {};

function Bell() {
  return <span data-testid="unread">{useNotifications().unread}</span>;
}

async function renderBell() {
  render(
    <NotificationsProvider>
      <Bell />
    </NotificationsProvider>
  );
  await waitFor(() => expect(getUnreadCount).toHaveBeenCalled());
  await act(async () => {});
}

beforeEach(() => {
  getUnreadCount.mockReset();
  getUnreadCount.mockResolvedValue(2);
  useSocketEvent.mockImplementation((event, handler) => {
    handlers[event] = handler;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('the number on the bell', () => {
  it('goes up at once on notification:new, without asking the API', async () => {
    await renderBell();
    getUnreadCount.mockClear();
    act(() => handlers['notification:new']({ id: '1', type: 'budget_over' }));
    expect(screen.getByTestId('unread')).toHaveTextContent('3');
    expect(getUnreadCount).not.toHaveBeenCalled();
  });

  it('asks for the true number when the notifications changed on another device', async () => {
    await renderBell();
    getUnreadCount.mockClear();
    getUnreadCount.mockResolvedValue(0);
    await act(async () => handlers['data:changed']({ resource: 'notifications' }));
    expect(screen.getByTestId('unread')).toHaveTextContent('0');
  });

  it('ignores a change of something else', async () => {
    await renderBell();
    getUnreadCount.mockClear();
    await act(async () => handlers['data:changed']({ resource: 'goals' }));
    expect(getUnreadCount).not.toHaveBeenCalled();
  });

  it('asks again after a reconnect', async () => {
    await renderBell();
    getUnreadCount.mockClear();
    await act(async () => handlers.reconnected());
    expect(getUnreadCount).toHaveBeenCalledTimes(1);
  });

  it('keeps polling as a safety net', async () => {
    vi.useFakeTimers();
    render(
      <NotificationsProvider>
        <Bell />
      </NotificationsProvider>
    );
    await act(async () => {});
    getUnreadCount.mockClear();
    await act(async () => vi.advanceTimersByTime(60 * 1000));
    expect(getUnreadCount).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
