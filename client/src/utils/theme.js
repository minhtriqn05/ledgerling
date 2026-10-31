// The color theme. The person chooses 'light', 'dark' or 'system' (follow the device).
// What the CSS needs is the result: <html data-theme="light"> or <html data-theme="dark"> (see styles/tokens.css).
// The choice is kept in localStorage, so it can be applied before React loads (the script in index.html does the
// same steps with the same key), and it is also saved on the account (preferences.theme) to follow the person.
export const THEME_STORAGE_KEY = 'ledgerling.theme';
export const THEMES = ['light', 'dark', 'system'];
export const DEFAULT_THEME = 'system';

export function isTheme(value) {
  return THEMES.includes(value);
}

// The stored choice; 'system' when nothing (or something unknown) is stored or localStorage is not available.
export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function storeTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage: the theme still works until the page is closed
  }
}

export function systemPrefersDark() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
}

// 'light' | 'dark' | 'system' -> 'light' | 'dark'
export function resolveTheme(theme, systemDark) {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  return systemDark ? 'dark' : 'light';
}

// Puts the result on <html>. Returns it.
export function applyResolvedTheme(resolved) {
  document.documentElement.setAttribute('data-theme', resolved);
  return resolved;
}
