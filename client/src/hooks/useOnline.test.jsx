import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Button from '../components/Button/Button.jsx';
import IconButton from '../components/IconButton/IconButton.jsx';
import OfflineBanner from '../components/OfflineBanner/OfflineBanner.jsx';

// navigator.onLine is read-only in the browser, so the test replaces the getter
function goOffline() {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  act(() => window.dispatchEvent(new Event('offline')));
}

function goOnline() {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  act(() => window.dispatchEvent(new Event('online')));
}

afterEach(() => {
  vi.restoreAllMocks();
});

const BANNER = "You're offline – showing saved data";
const NOTE = "Not available while you're offline";

describe('OfflineBanner', () => {
  it('shows only while offline, and goes away again', () => {
    render(<OfflineBanner />);
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
    goOffline();
    expect(screen.getByText(BANNER)).toBeInTheDocument();
    goOnline();
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
  });
});

describe('needsNetwork', () => {
  it('locks a Button while offline, with the note, and frees it afterwards', () => {
    render(<Button needsNetwork title="Save it">Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute('title', 'Save it');

    goOffline();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', NOTE);

    goOnline();
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute('title', 'Save it');
  });

  it('locks an IconButton the same way', () => {
    render(<IconButton needsNetwork icon="trash" label="Delete" />);
    goOffline();
    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', NOTE);
  });

  it('keeps a button disabled for its own reason when online', () => {
    render(<Button needsNetwork disabled>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('leaves a button without the prop alone (filters, Cancel, month arrows)', () => {
    render(<Button>Cancel</Button>);
    goOffline();
    const button = screen.getByRole('button', { name: 'Cancel' });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('title');
  });
});
