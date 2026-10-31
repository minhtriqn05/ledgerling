import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useThemeChoice } from './useThemeChoice.js';
import { updatePreferences } from '../api/users.js';
import { ThemeProvider } from '../context/ThemeContext.jsx';

vi.mock('../api/users.js', () => ({ updatePreferences: vi.fn() }));
vi.mock('../api/axios.js', () => ({ getErrorMessage: () => 'Cannot reach the server.' }));
const updateUser = vi.fn();
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => ({ updateUser }) }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../context/ToastContext.jsx', () => ({ useToast: () => toast }));

const setup = () => renderHook(() => useThemeChoice(), { wrapper: ThemeProvider });

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  updatePreferences.mockReset();
  updateUser.mockReset();
  toast.error.mockReset();
});

describe('useThemeChoice', () => {
  it('changes the page at once and saves the choice on the account', async () => {
    updatePreferences.mockResolvedValue({ name: 'Tri' });
    const { result } = setup();

    await act(() => result.current.choose('dark'));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('ledgerling.theme')).toBe('dark');
    expect(updatePreferences).toHaveBeenCalledWith({ theme: 'dark' });
    expect(updateUser).toHaveBeenCalledWith({ name: 'Tri' });
  });

  it('asks nothing when the same theme is chosen again', async () => {
    const { result } = setup();
    await act(() => result.current.choose('system'));
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it('brings the old theme back and shows the error when saving fails', async () => {
    updatePreferences.mockRejectedValue(new Error('offline'));
    const { result } = setup();

    await act(() => result.current.choose('dark'));

    await waitFor(() => expect(result.current.theme).toBe('system'));
    expect(toast.error).toHaveBeenCalledWith('Cannot reach the server.');
  });

  it('toggle goes from what is on screen to the other one', async () => {
    updatePreferences.mockResolvedValue({});
    const { result } = setup();

    // The test browser is light (see src/test/setup.js)
    await act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    await act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
  });
});
