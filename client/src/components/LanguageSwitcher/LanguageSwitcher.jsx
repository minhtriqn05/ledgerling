import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../i18n/languages.js';
import Icon from '../Icon.jsx';
import Select from '../Select/Select.jsx';
import styles from './LanguageSwitcher.module.css';

const OPTIONS = LANGUAGES.map((language) => ({
  value: language.code,
  label: language.name,
  lang: language.code,
  short: language.short,
  hint: language.short,
}));

// The language picker. i18next stores the choice in localStorage and changes <html lang> (see i18n/index.js).
// Closed it is small: a globe and the short code (EN, VI...). The list has each language written in its own language,
// with its code and a tick on the current one; it is our Select (keyboard, typeahead, animated).
export default function LanguageSwitcher({ className = '' }) {
  const { t, i18n } = useTranslation();

  return (
    <div className={`${styles.switcher} ${className}`}>
      <Select
        variant="pill"
        label={t('language.label')}
        icon={<Icon name="globe" size={16} />}
        showChevron={false}
        value={i18n.resolvedLanguage}
        options={OPTIONS}
        onChange={(code) => i18n.changeLanguage(code)}
        data-testid="language-select"
      />
    </div>
  );
}
