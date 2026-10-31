import { useTranslation } from 'react-i18next';
import { updatePreferences } from '../../api/users.js';
import { getErrorMessage } from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import Icon from '../../components/Icon.jsx';
import styles from './Settings.module.css';

const OPTIONS = [
  { value: 'light', icon: 'sun' },
  { value: 'dark', icon: 'moon' },
  { value: 'system', icon: 'monitor' },
];

// Light, Dark or System (follows the device). The page changes at once and the choice is kept in localStorage
// (so the next load is painted in the right colors from the first frame) and on the account (so it follows the
// person to another device). If the account cannot be reached, the old theme comes back.
export default function AppearanceSection() {
  const { t } = useTranslation();
  const { updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
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

  return (
    <Card>
      <CardHeader icon="sun" tone="sun" title={t('settings.appearance.title')} subtitle={t('settings.appearance.text')} />
      <div className={styles.themes} role="radiogroup" aria-label={t('settings.appearance.theme')}>
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={theme === option.value}
            className={`${styles.theme} ${theme === option.value ? styles.themeChosen : ''}`}
            onClick={() => choose(option.value)}
          >
            <Icon name={option.icon} size={22} />
            {t(`settings.appearance.${option.value}`)}
          </button>
        ))}
      </div>
    </Card>
  );
}
