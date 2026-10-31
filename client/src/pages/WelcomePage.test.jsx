import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WelcomePage from './WelcomePage.jsx';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
// The language picker is its own component with its own tests
vi.mock('../components/LanguageSwitcher/LanguageSwitcher.jsx', () => ({ default: () => <div>Language picker</div> }));

const loginAsDemo = vi.fn();

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/welcome']}>
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/" element={<p>Dashboard page</p>} />
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/register" element={<p>Register page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  loginAsDemo.mockReset();
  useAuth.mockReturnValue({ user: null, loading: false, loginAsDemo });
});

describe('WelcomePage', () => {
  it('shows the hero: one h1, and the Get started, Try the demo and Log in actions', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Know where your money goes.');
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('button', { name: 'Try the demo' })).toBeEnabled();
    // The header and the hero both have a Log in link
    for (const link of screen.getAllByRole('link', { name: 'Log in' })) expect(link).toHaveAttribute('href', '/login');
  });

  it('lists six features, each with its own heading', () => {
    renderPage();

    const features = screen.getByRole('region', { name: 'Everything you need to stay on top of your money' });
    expect(features.querySelectorAll('li')).toHaveLength(6);
    expect(screen.getByRole('heading', { name: 'Budgets that warn you', level: 3 })).toBeInTheDocument();
  });

  it('explains how it works in three steps', () => {
    renderPage();

    const steps = screen.getByRole('region', { name: 'How it works' });
    expect(steps.querySelectorAll('ol > li')).toHaveLength(3);
  });

  it('has a footer with a link to GitHub that opens in a new tab', () => {
    renderPage();

    const link = screen.getByRole('link', { name: /View on GitHub/ });
    expect(link).toHaveAttribute('href', 'https://github.com/minhtriqn05/ledgerling');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('says the server is starting while the demo account signs in, and disables the button', async () => {
    const user = userEvent.setup();
    loginAsDemo.mockReturnValue(new Promise(() => {})); // the free server is still waking up
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Try the demo' }));

    expect(loginAsDemo).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Starting the server, this can take up to a minute…');
    expect(screen.getByRole('button', { name: 'Try the demo' })).toBeDisabled();
  });

  it('shows the error and enables the button again when the demo is not available', async () => {
    const user = userEvent.setup();
    loginAsDemo.mockRejectedValue({ response: { data: { code: 'DEMO_UNAVAILABLE', message: 'Demo account is not available' } } });
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Try the demo' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The demo is not available right now'));
    expect(screen.getByRole('button', { name: 'Try the demo' })).toBeEnabled();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('sends a signed-in user to the Dashboard', () => {
    useAuth.mockReturnValue({ user: { name: 'Tri' }, loading: false, loginAsDemo });
    renderPage();

    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('waits while a stored token is being checked, without showing the page or redirecting', () => {
    useAuth.mockReturnValue({ user: null, loading: true, loginAsDemo });
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });
});
