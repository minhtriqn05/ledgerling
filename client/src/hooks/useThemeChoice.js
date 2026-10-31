import { updatePreferences } from '../api/users.js';
import { getErrorMessage } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Choosing a theme, shared by Settings > Appearance, the user menu and the command palette.
// The page changes at once and the choice is kept in localStorage (so the next load is painted in the right colors
// from the first frame) and on the account (so it follows the person to another device).
// If the account cannot be reached, the old theme comes back.
export function useThemeChoice() {
  const { updateUser } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const toast = useToast();

  async function choose(next) {
    if (next === theme) return;
    const previous = theme;
    setTheme(next);
    try {
      updateUser(await updatePreferences({ theme: next }));
    } catch (err) {
      setTheme(previous);
      toast.error(getErrorMessage(err));
    }
  }

  // Light to dark and back, whatever "system" looks like right now
  function toggle() {
    return choose(resolvedTheme === 'dark' ? 'light' : 'dark');
  }

  return { theme, choose, toggle };
}
