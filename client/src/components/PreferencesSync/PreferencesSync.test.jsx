import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import i18n from '../../i18n/index.js';
import PreferencesSync from './PreferencesSync.jsx';
import { updatePreferences } from '../../api/users.js';
import { useAuth } from '../../context/AuthContext.jsx';

vi.mock('../../api/users.js', () => ({ updatePreferences: vi.fn() }));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
const setTheme = vi.fn();
vi.mock('../../context/ThemeContext.jsx', () => ({ useTheme: () => ({ setTheme }) }));

const updateUser = vi.fn();

function signedIn(preferences) {
  useAuth.mockReturnValue({ user: { _id: 'u1', preferences }, updateUser });
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  updatePreferences.mockReset();
  updatePreferences.mockResolvedValue({ _id: 'u1' });
  updateUser.mockReset();
  setTheme.mockReset();
});

afterEach(() => i18n.changeLanguage('en'));

describe('PreferencesSync', () => {
  it('applies the theme and the language saved on the account when someone is signed in', async () => {
    signedIn({ theme: 'dark', language: 'vi' });
    render(<PreferencesSync />);

    expect(setTheme).toHaveBeenCalledWith('dark');
    await waitFor(() => expect(i18n.resolvedLanguage).toBe('vi'));
    // That language came from the account, so it is not sent back
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it('keeps the language of this device when the account never chose one', () => {
    signedIn({ theme: 'system' });
    render(<PreferencesSync />);

    expect(i18n.resolvedLanguage).toBe('en');
    expect(setTheme).toHaveBeenCalledWith('system');
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it('does nothing when nobody is signed in, and does not save a language change', async () => {
    useAuth.mockReturnValue({ user: null, updateUser });
    render(<PreferencesSync />);
    await i18n.changeLanguage('de');

    expect(setTheme).not.toHaveBeenCalled();
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it('saves a language change made while signed in, and updates the user with the answer', async () => {
    signedIn({ theme: 'light', language: 'vi' });
    render(<PreferencesSync />);
    await waitFor(() => expect(i18n.resolvedLanguage).toBe('vi'));

    await i18n.changeLanguage('ja');

    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ language: 'ja' }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ _id: 'u1' }));
    expect(updatePreferences).toHaveBeenCalledTimes(1);
  });

  it('does not send the same language twice', async () => {
    signedIn({ theme: 'light' });
    render(<PreferencesSync />);

    await i18n.changeLanguage('fr');
    await waitFor(() => expect(updatePreferences).toHaveBeenCalledTimes(1));
    await i18n.changeLanguage('fr');
    expect(updatePreferences).toHaveBeenCalledTimes(1);
  });

  it('survives a failed save', async () => {
    signedIn({ theme: 'light' });
    updatePreferences.mockRejectedValue(new Error('offline'));
    render(<PreferencesSync />);

    await i18n.changeLanguage('es');
    await waitFor(() => expect(updatePreferences).toHaveBeenCalledTimes(1));
    expect(i18n.resolvedLanguage).toBe('es');
    expect(updateUser).not.toHaveBeenCalled();
  });
});
