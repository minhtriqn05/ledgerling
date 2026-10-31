import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { LANGUAGES } from '../../i18n/languages.js';
import styles from './LanguageSwitcher.module.css';

// The language picker. i18next stores the choice in localStorage and changes <html lang> (see i18n/index.js).
// A native <select>, so it works with the keyboard and uses the phone's own list.
export default function LanguageSwitcher({ className = '' }) {
  const { t, i18n } = useTranslation();

  return (
    <label className={`${styles.switcher} ${className}`}>
      <Languages size={16} aria-hidden="true" />
      <span className={styles.srOnly}>{t('language.label')}</span>
      <select
        className={styles.select}
        value={i18n.resolvedLanguage}
        data-testid="language-select"
        onChange={(event) => i18n.changeLanguage(event.target.value)}
      >
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code} lang={language.code}>
            {language.name}
          </option>
        ))}
      </select>
    </label>
  );
}
