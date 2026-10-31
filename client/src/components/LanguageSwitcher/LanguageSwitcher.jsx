import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { LANGUAGES } from '../../i18n/languages.js';
import Select from '../Select/Select.jsx';
import styles from './LanguageSwitcher.module.css';

const OPTIONS = LANGUAGES.map((language) => ({ value: language.code, label: language.name, lang: language.code }));

// The language picker. i18next stores the choice in localStorage and changes <html lang> (see i18n/index.js).
// Each language is written in its own language; the list is our Select (keyboard, typeahead, animated).
export default function LanguageSwitcher({ className = '' }) {
  const { t, i18n } = useTranslation();

  return (
    <div className={`${styles.switcher} ${className}`}>
      <Select
        variant="pill"
        label={t('language.label')}
        icon={<Languages size={16} aria-hidden="true" />}
        value={i18n.resolvedLanguage}
        options={OPTIONS}
        onChange={(code) => i18n.changeLanguage(code)}
        data-testid="language-select"
      />
    </div>
  );
}
