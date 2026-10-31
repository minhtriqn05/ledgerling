import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import Icon from '../components/Icon.jsx';
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
// For the demo account the Password, Sessions and Danger zone cards are left out.
// An address like /settings#notifications scrolls to the card with that id.
export default function SettingsPage() {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const { user } = useAuth();
  // The shared demo account cannot change its password, end sessions or be deleted (the API answers 403), so the cards are hidden
  const isDemo = Boolean(user?.isDemo);

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <div className={styles.page}>
      <PageHeader title={t('nav.settings')} subtitle={t('settings.subtitle')} />

      {isDemo && (
        <p className={styles.demoNote} role="note">
          <Icon name="info" size={18} />
          <span>{t('settings.demoNote')}</span>
        </p>
      )}

      <div className={styles.columns}>
        <div className={styles.column}>
          <ProfileSection />
          {!isDemo && <PasswordSection />}
          {!isDemo && <SessionsSection />}
        </div>
        <div className={styles.column}>
          <AppearanceSection />
          <PreferencesSection />
          <div id="notifications">
            <NotificationSettings />
          </div>
          <DataSection />
          {!isDemo && <DangerSection />}
        </div>
      </div>
    </div>
  );
}
