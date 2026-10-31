import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { applyResolvedTheme, getStoredTheme, resolveTheme, storeTheme, systemPrefersDark } from '../utils/theme.js';

// Holds the color theme for the whole app: the choice (light | dark | system) and the result (light | dark).
// <html data-theme> is changed at once, before the React state, so a chart that reads its colors from the CSS
// variables while it renders already sees the new ones.

// Without a provider (a unit test that renders one chart) the light theme is assumed
const ThemeContext = createContext({ theme: 'system', resolvedTheme: 'light', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const resolvedTheme = resolveTheme(theme, systemDark);

  // The device switches between light and dark (e.g. at sunset). It only matters while the choice is 'system'.
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query?.addEventListener) return;

    function handleChange(event) {
      applyResolvedTheme(resolveTheme(getStoredTheme(), event.matches));
      setSystemDark(event.matches);
    }
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  // Safety net: the attribute always matches the state
  useLayoutEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next) => {
    storeTheme(next);
    applyResolvedTheme(resolveTheme(next, systemPrefersDark()));
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Usage: const { theme, resolvedTheme, setTheme } = useTheme();
// A component that reads colors with cssVar() while it renders calls this too, so it renders again when the theme changes.
export function useTheme() {
  return useContext(ThemeContext);
}
