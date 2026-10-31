import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from './SettingsPage.jsx';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
// Each card has its own tests and talks to the API: here only the page decides which cards it shows
const stub = vi.hoisted(() => (name) => ({ default: () => <section>{name} card</section> }));
vi.mock('./settings/ProfileSection.jsx', () => stub('Profile'));
vi.mock('./settings/PasswordSection.jsx', () => stub('Password'));
vi.mock('./settings/SessionsSection.jsx', () => stub('Sessions'));
vi.mock('./settings/AppearanceSection.jsx', () => stub('Appearance'));
vi.mock('./settings/PreferencesSection.jsx', () => stub('Preferences'));
vi.mock('./notifications/NotificationSettings.jsx', () => stub('Notifications'));
vi.mock('./settings/DataSection.jsx', () => stub('Data'));
vi.mock('./settings/DangerSection.jsx', () => stub('Danger zone'));

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  );
}

const card = (name) => screen.queryByText(`${name} card`);

describe('SettingsPage', () => {
  it('shows every card to a normal user, and no demo note', () => {
    useAuth.mockReturnValue({ user: { name: 'Tri', isDemo: false } });
    renderPage();

    for (const name of ['Profile', 'Password', 'Sessions', 'Appearance', 'Preferences', 'Notifications', 'Data', 'Danger zone']) {
      expect(card(name)).toBeInTheDocument();
    }
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('hides Password, Sessions and Danger zone for the demo account, and says why', () => {
    useAuth.mockReturnValue({ user: { name: 'Demo User', isDemo: true } });
    renderPage();

    expect(card('Password')).not.toBeInTheDocument();
    expect(card('Sessions')).not.toBeInTheDocument();
    expect(card('Danger zone')).not.toBeInTheDocument();
    // The rest stays: the demo can still be explored
    for (const name of ['Profile', 'Appearance', 'Preferences', 'Notifications', 'Data']) {
      expect(card(name)).toBeInTheDocument();
    }
    expect(screen.getByRole('note')).toHaveTextContent('You are using the shared demo account');
  });
});
