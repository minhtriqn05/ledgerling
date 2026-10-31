import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  getStoredTheme,
  isTheme,
  resolveTheme,
  storeTheme,
  systemPrefersDark,
} from './theme.js';

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.restoreAllMocks();
});

describe('resolveTheme', () => {
  it('keeps light and dark whatever the device says', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the device for system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('stored theme', () => {
  it('is system until a choice is stored', () => {
    expect(getStoredTheme()).toBe('system');
  });

  it('gives back what was stored', () => {
    storeTheme('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(getStoredTheme()).toBe('dark');
  });

  it('ignores a value that is not a theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(getStoredTheme()).toBe('system');
    expect(isTheme('purple')).toBe(false);
    expect(isTheme('light')).toBe(true);
  });

  it('does not break when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(getStoredTheme()).toBe('system');
    expect(() => storeTheme('dark')).not.toThrow();
  });
});

describe('applyResolvedTheme', () => {
  it('sets data-theme on <html>', () => {
    expect(applyResolvedTheme('dark')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyResolvedTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

describe('systemPrefersDark', () => {
  it('reads prefers-color-scheme', () => {
    const original = window.matchMedia;
    window.matchMedia = (query) => ({ matches: query.includes('dark'), media: query });
    expect(systemPrefersDark()).toBe(true);
    window.matchMedia = () => ({ matches: false });
    expect(systemPrefersDark()).toBe(false);
    window.matchMedia = original;
  });
});
