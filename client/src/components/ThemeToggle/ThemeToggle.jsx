import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useThemeChoice } from '../../hooks/useThemeChoice.js';
import Icon from '../Icon.jsx';
import styles from './ThemeToggle.module.css';

const OPTIONS = [
  { value: 'light', icon: 'sun' },
  { value: 'dark', icon: 'moon' },
];

// The two small round buttons in the top bar: Porcelain and Noir. A thumb slides behind the one in use.
// "System" stays a choice in Settings and in the user menu; here the thumb shows what is on screen right now.
export default function ThemeToggle() {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const { choose } = useThemeChoice();

  return (
    <div className={styles.toggle} role="group" aria-label={t('settings.appearance.theme')} data-resolved={resolvedTheme}>
      <span className={styles.thumb} aria-hidden="true" />
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.option} ${resolvedTheme === option.value ? styles.current : ''}`}
          aria-pressed={resolvedTheme === option.value}
          aria-label={t(`settings.appearance.${option.value}`)}
          title={t(`settings.appearance.${option.value}`)}
          onClick={() => choose(option.value)}
        >
          <Icon name={option.icon} size={16} />
        </button>
      ))}
    </div>
  );
}
