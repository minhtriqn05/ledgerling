import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import ProfileSection from './settings/ProfileSection.jsx';
import PasswordSection from './settings/PasswordSection.jsx';
import SessionsSection from './settings/SessionsSection.jsx';
import AppearanceSection from './settings/AppearanceSection.jsx';
import PreferencesSection from './settings/PreferencesSection.jsx';
import NotificationSettings from './notifications/NotificationSettings.jsx';
import DataSection from './settings/DataSection.jsx';
import DangerSection from './settings/DangerSection.jsx';
import styles from './SettingsPage.module.css';

// Settings: the account (profile, password, sessions) in the left column and how the app looks and behaves
// (appearance, preferences, notifications, data, danger zone) in the right one. One column on narrow screens.
// An address like /settings#notifications scrolls to the card with that id.
export default function SettingsPage() {
  const { t } = useTranslation();
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <div className={styles.page}>
      <PageHeader title={t('nav.settings')} subtitle={t('settings.subtitle')} />

      <div className={styles.columns}>
        <div className={styles.column}>
          <ProfileSection />
          <PasswordSection />
          <SessionsSection />
        </div>
        <div className={styles.column}>
          <AppearanceSection />
          <PreferencesSection />
          <div id="notifications">
            <NotificationSettings />
          </div>
          <DataSection />
          <DangerSection />
        </div>
      </div>
    </div>
  );
}
