import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { settingsLabelKey, settingsPath } from '../../config/settingsSections.js';
import Icon from '../../components/Icon.jsx';
import styles from './SettingsMenu.module.css';

// The sections of Settings: a column next to the open section on a wide screen, a list of cards on a phone
// (the CSS decides how it looks; SettingsPage decides when it shows).
export default function SettingsMenu({ sections }) {
  const { t } = useTranslation();

  return (
    <nav className={styles.menu} aria-label={t('settings.menuLabel')}>
      <ul className={styles.list}>
        {sections.map((section) => (
          <li key={section.id} className={section.danger ? styles.dangerItem : undefined}>
            <NavLink
              to={settingsPath(section.id)}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''} ${section.danger ? styles.danger : ''}`}
            >
              <span className={styles.tile} style={{ '--tone': `var(--accent-${section.tone})` }}>
                <Icon name={section.icon} size={18} />
              </span>
              <span className={styles.text}>
                <span className={styles.label}>{t(settingsLabelKey(section.id))}</span>
                <span className={styles.description}>{t(`settings.sections.${section.id}.description`)}</span>
              </span>
              <span className={styles.chevron}>
                <Icon name="chevronRight" size={16} />
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
