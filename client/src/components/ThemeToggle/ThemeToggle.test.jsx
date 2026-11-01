import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle.jsx';
import { updatePreferences } from '../../api/users.js';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

vi.mock('../../api/users.js', () => ({ updatePreferences: vi.fn(async () => ({ name: 'Tri' })) }));
vi.mock('../../api/axios.js', () => ({ getErrorMessage: () => 'failed' }));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ updateUser: vi.fn() }) }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => ({ error: vi.fn() }) }));

function renderToggle() {
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}

const button = (name) => screen.getByRole('button', { name });

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.clearAllMocks();
});

describe('ThemeToggle', () => {
  it('shows the theme on screen: dark for somebody who never chose', () => {
    renderToggle();
    expect(screen.getByRole('group', { name: 'Theme' })).toHaveAttribute('data-resolved', 'dark');
    expect(button('Dark')).toHaveAttribute('aria-pressed', 'true');
    expect(button('Light')).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows what "system" means on this device', () => {
    localStorage.setItem('ledgerling.theme', 'system');
    renderToggle();
    // The test browser is light (see src/test/setup.js)
    expect(button('Light')).toHaveAttribute('aria-pressed', 'true');
  });

  it('changes the page at once and saves the choice on the account', async () => {
    renderToggle();
    await userEvent.click(button('Light'));

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(button('Light')).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ theme: 'light' }));
  });

  it('asks nothing when the theme in use is clicked', async () => {
    renderToggle();
    await userEvent.click(button('Dark'));
    expect(updatePreferences).not.toHaveBeenCalled();
  });
});
