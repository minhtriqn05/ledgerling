import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InstallSection from '../pages/settings/InstallSection.jsx';
import { resetInstallPrompt } from './installPrompt.js';

function offerInstall(outcome = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = vi.fn().mockResolvedValue();
  event.userChoice = Promise.resolve({ outcome });
  act(() => window.dispatchEvent(event));
  return event;
}

const BUTTON = { name: 'Install app' };

beforeEach(() => {
  resetInstallPrompt();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InstallSection', () => {
  it('shows the Add to Home Screen instructions when the browser offers nothing', () => {
    render(<InstallSection />);
    expect(screen.queryByRole('button', BUTTON)).not.toBeInTheDocument();
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
  });

  it('shows the button once the browser offers the install, and keeps the browser banner away', () => {
    render(<InstallSection />);
    const event = offerInstall();
    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole('button', BUTTON)).toBeInTheDocument();
    expect(screen.queryByText(/Add to Home Screen/)).not.toBeInTheDocument();
  });

  it('keeps an offer that came before the page opened', () => {
    offerInstall();
    render(<InstallSection />);
    expect(screen.getByRole('button', BUTTON)).toBeInTheDocument();
  });

  it('opens the dialog of the browser on click; the offer works once', async () => {
    render(<InstallSection />);
    const event = offerInstall('dismissed');
    await userEvent.click(screen.getByRole('button', BUTTON));
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', BUTTON)).not.toBeInTheDocument();
  });

  it('says so after the app was installed', () => {
    render(<InstallSection />);
    offerInstall();
    act(() => window.dispatchEvent(new Event('appinstalled')));
    expect(screen.getByText('Ledgerling is installed on this device.')).toBeInTheDocument();
  });

  it('says so when it runs as the installed app', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true });
    render(<InstallSection />);
    expect(screen.getByText('Ledgerling is installed on this device.')).toBeInTheDocument();
  });
});
