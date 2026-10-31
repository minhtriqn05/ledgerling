import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { updatePreferences } from '../../api/users.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { isTheme } from '../../utils/theme.js';

// Keeps the device and the account in step. It draws nothing.
// - When a person signs in (or the page opens with a saved session), the theme and the language saved on the
//   account are applied here, so the app looks the same on every device. A language that was never chosen is not
//   saved on the account, and this device keeps the one it has.
// - When the language is changed while signed in (the language picker), it is saved on the account.
// The theme is saved by the Appearance card itself.
export default function PreferencesSync() {
  const { i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const { setTheme } = useTheme();
  // The language the account is known to have, so applying it here does not send it back
  const savedLanguage = useRef(null);
  const userId = user?._id;

  useEffect(() => {
    if (!user) {
      savedLanguage.current = null;
      return;
    }
    const { theme, language } = user.preferences ?? {};
    savedLanguage.current = language ?? null;
    if (isTheme(theme)) setTheme(theme);
    if (language && language !== i18n.resolvedLanguage) i18n.changeLanguage(language);
    // Only when another person (or nobody) becomes the user: a new copy of the same user changes nothing here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    function handleLanguageChanged(language) {
      if (language === savedLanguage.current) return;
      savedLanguage.current = language;
      // A failure is not worth a message: the language works on this device, and the next change tries again
      updatePreferences({ language })
        .then(updateUser)
        .catch(() => {
          savedLanguage.current = null;
        });
    }
    i18n.on('languageChanged', handleLanguageChanged);
    return () => i18n.off('languageChanged', handleLanguageChanged);
  }, [userId, i18n, updateUser]);

  return null;
}
