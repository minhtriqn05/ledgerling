import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import UserMenu from './UserMenu.jsx';
import { updatePreferences } from '../../api/users.js';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

vi.mock('../../api/users.js', () => ({ updatePreferences: vi.fn(async () => ({ name: 'Tri' })) }));
vi.mock('../../api/axios.js', () => ({ getErrorMessage: () => 'failed' }));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ updateUser: vi.fn() }) }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => ({ error: vi.fn() }) }));

const handlers = { onShortcuts: vi.fn(), onTour: vi.fn(), onLogout: vi.fn(), onLeave: vi.fn() };

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderMenu() {
  render(
    <MemoryRouter>
      <ThemeProvider>
        <UserMenu user={{ name: 'Tri', email: 'tri@example.com' }} {...handlers} />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

const trigger = () => screen.getByTestId('account');

beforeEach(() => {
  localStorage.clear();
  Object.values(handlers).forEach((handler) => handler.mockReset());
  updatePreferences.mockClear();
});

describe('UserMenu', () => {
  it('shows who is signed in, and is closed at first', () => {
    renderMenu();
    expect(screen.getByTestId('account-name')).toHaveTextContent('Tri');
    expect(trigger()).toHaveTextContent('tri@example.com');
    expect(trigger()).toHaveAccessibleName('Tri');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens with every item, and the focus moves in', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(trigger());

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Profile',
      'Settings',
      'Keyboard shortcuts',
      'Take the tour',
      'Log out',
    ]);
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(3);
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus();
  });

  it('goes to the profile and to Settings', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(trigger());
    await user.click(screen.getByRole('menuitem', { name: 'Profile' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/settings/profile');
    expect(handlers.onLeave).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

    await user.click(trigger());
    await user.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/settings$/);
  });

  it('calls the shortcuts, the tour and log out', async () => {
    const user = userEvent.setup();
    renderMenu();

    for (const [name, handler] of [
      ['Keyboard shortcuts', handlers.onShortcuts],
      ['Take the tour', handlers.onTour],
      ['Log out', handlers.onLogout],
    ]) {
      await user.click(trigger());
      await user.click(screen.getByRole('menuitem', { name }));
      expect(handler, name).toHaveBeenCalledTimes(1);
    }
  });

  it('switches the theme and stays open', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(trigger());
    expect(screen.getByRole('menuitemradio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('menuitemradio', { name: 'Dark' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(updatePreferences).toHaveBeenCalledWith({ theme: 'dark' });
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('works with the keyboard: arrows move around, Escape goes back to the card', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(trigger());

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger()).toHaveFocus();
  });

  it('closes on a click outside', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(trigger());
    await user.click(screen.getByTestId('where'));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});
