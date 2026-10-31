import { useTranslation } from 'react-i18next';
import { useThemeChoice } from '../../hooks/useThemeChoice.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import Icon from '../../components/Icon.jsx';
import styles from './Settings.module.css';

const OPTIONS = [
  { value: 'light', icon: 'sun' },
  { value: 'dark', icon: 'moon' },
  { value: 'system', icon: 'monitor' },
];

// Light, Dark or System (follows the device). hooks/useThemeChoice.js does the changing and the saving.
export default function AppearanceSection() {
  const { t } = useTranslation();
  const { theme, choose } = useThemeChoice();

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
