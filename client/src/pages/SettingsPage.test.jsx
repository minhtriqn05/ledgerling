import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
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
vi.mock('./settings/InstallSection.jsx', () => stub('Install'));
vi.mock('./settings/DangerSection.jsx', () => stub('Danger zone'));

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

// oneColumn: a phone, where the width query matches
function renderAt(url, { oneColumn = false, demo = false } = {}) {
  window.matchMedia = (query) => ({
    matches: query.includes('reduce') || (oneColumn && query.includes('max-width')),
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  useAuth.mockReturnValue({ user: { name: 'Tri', isDemo: demo } });
  const router = createMemoryRouter(
    [
      { path: '/settings/:section?', element: <SettingsPage /> },
      { path: '/', element: <p>Dashboard page</p> },
    ],
    { initialEntries: [url] }
  );
  render(<RouterProvider router={router} />);
  return router;
}

const card = (name) => screen.queryByText(`${name} card`);
const menu = () => screen.queryByRole('navigation', { name: 'Settings sections' });
const ALL_CARDS = ['Profile', 'Password', 'Sessions', 'Appearance', 'Preferences', 'Notifications', 'Install', 'Data', 'Danger zone'];

describe('SettingsPage on a wide screen', () => {
  it('opens Profile at /settings, with the menu next to it', async () => {
    const router = renderAt('/settings');

    expect(await screen.findByText('Profile card')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/settings/profile');
    expect(menu()).toBeInTheDocument();
  });

  it('shows only the section that is chosen', () => {
    renderAt('/settings/appearance');

    for (const name of ALL_CARDS) {
      if (name === 'Appearance') expect(card(name)).toBeInTheDocument();
      else expect(card(name)).not.toBeInTheDocument();
    }
  });

  it('has Password and Sessions together under Security', () => {
    renderAt('/settings/security');
    expect(card('Password')).toBeInTheDocument();
    expect(card('Sessions')).toBeInTheDocument();
  });

  it('has a link with an icon, a name and one line of text for every section, marking the open one', () => {
    renderAt('/settings/security');

    const links = within(menu()).getAllByRole('link');
    expect(links).toHaveLength(8);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      ['profile', 'security', 'appearance', 'preferences', 'notifications', 'app', 'data', 'danger'].map((id) => `/settings/${id}`)
    );
    const security = within(menu()).getByRole('link', { name: /Security/ });
    expect(security).toHaveAttribute('aria-current', 'page');
    expect(security).toHaveTextContent('Password and signed-in devices');
    expect(security.querySelector('svg')).toBeInTheDocument();
  });

  it('moves to another section from the menu, and Back goes to the first section or out of Settings', async () => {
    const user = userEvent.setup();
    const router = renderAt('/settings/data');

    await user.click(within(menu()).getByRole('link', { name: /Appearance/ }));
    expect(await screen.findByText('Appearance card')).toBeInTheDocument();
    expect(card('Data')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Back' }));
    expect(await screen.findByText('Profile card')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/settings/profile');

    await user.click(screen.getByRole('link', { name: 'Back' }));
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it('goes back to /settings from an address that is not a section', async () => {
    const router = renderAt('/settings/nonsense');
    expect(await screen.findByText('Profile card')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/settings/profile');
  });
});

describe('SettingsPage on a phone', () => {
  it('shows the list of sections at /settings, without a section or a Back link', () => {
    const router = renderAt('/settings', { oneColumn: true });

    expect(router.state.location.pathname).toBe('/settings');
    expect(within(menu()).getAllByRole('link')).toHaveLength(8);
    for (const name of ALL_CARDS) expect(card(name)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('opens a section on its own page, and Back returns to the list', async () => {
    const user = userEvent.setup();
    renderAt('/settings', { oneColumn: true });

    await user.click(within(menu()).getByRole('link', { name: /Danger zone/ }));
    expect(await screen.findByText('Danger zone card')).toBeInTheDocument();
    expect(menu()).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Back' }));
    expect(await screen.findByRole('navigation', { name: 'Settings sections' })).toBeInTheDocument();
    expect(card('Danger zone')).not.toBeInTheDocument();
  });
});

describe('SettingsPage for the demo account', () => {
  it('has no Security and Danger zone, and says why', () => {
    renderAt('/settings/profile', { demo: true });

    expect(within(menu()).getAllByRole('link')).toHaveLength(6);
    expect(within(menu()).queryByRole('link', { name: /Security/ })).not.toBeInTheDocument();
    expect(within(menu()).queryByRole('link', { name: /Danger zone/ })).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('You are using the shared demo account');
  });

  it('sends those addresses back to Profile', async () => {
    const router = renderAt('/settings/danger', { demo: true });

    expect(await screen.findByText('Profile card')).toBeInTheDocument();
    expect(card('Danger zone')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/settings/profile');
  });

  it('shows no note to a normal user', () => {
    renderAt('/settings/profile');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
