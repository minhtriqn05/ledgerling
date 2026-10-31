import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext.jsx';
import { THEME_STORAGE_KEY } from '../utils/theme.js';

// A matchMedia whose "dark" answer the test can change, with the listeners of the real one
let systemDark;
let listeners;
const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  systemDark = false;
  listeners = [];
  window.matchMedia = (query) => ({
    media: query,
    get matches() {
      return query.includes('dark') ? systemDark : query.includes('reduce');
    },
    addEventListener: (_event, listener) => listeners.push(listener),
    removeEventListener: (_event, listener) => {
      listeners = listeners.filter((l) => l !== listener);
    },
  });
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

function Probe() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <>
      <p data-testid="state">{`${theme}/${resolvedTheme}`}</p>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('system')}>System</button>
    </>
  );
}

const renderProbe = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>
  );

describe('ThemeProvider', () => {
  it('starts on system, which is light on a light device', () => {
    renderProbe();
    expect(screen.getByTestId('state')).toHaveTextContent('system/light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('starts with the theme stored in localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderProbe();
    expect(screen.getByTestId('state')).toHaveTextContent('dark/dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('changes <html data-theme> and localStorage when a theme is chosen', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByTestId('state')).toHaveTextContent('dark/dark');

    await userEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('follows the device while the choice is system', async () => {
    renderProbe();
    act(() => {
      systemDark = true;
      listeners.forEach((listener) => listener({ matches: true }));
    });

    expect(screen.getByTestId('state')).toHaveTextContent('system/dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('ignores the device once light or dark is chosen', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'Light' }));
    act(() => {
      systemDark = true;
      listeners.forEach((listener) => listener({ matches: true }));
    });

    expect(screen.getByTestId('state')).toHaveTextContent('light/light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('answers light without a provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('state')).toHaveTextContent('system/light');
  });
});
