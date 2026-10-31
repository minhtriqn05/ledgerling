import { Navigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { UnsavedChangesGuard } from '../context/UnsavedChangesContext.jsx';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { settingsLabelKey, settingsPath, visibleSections } from '../config/settingsSections.js';
import BackButton from '../components/BackButton/BackButton.jsx';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import Icon from '../components/Icon.jsx';
import ProfileSection from './settings/ProfileSection.jsx';
import PasswordSection from './settings/PasswordSection.jsx';
import SessionsSection from './settings/SessionsSection.jsx';
import AppearanceSection from './settings/AppearanceSection.jsx';
import PreferencesSection from './settings/PreferencesSection.jsx';
import NotificationSettings from './notifications/NotificationSettings.jsx';
import DataSection from './settings/DataSection.jsx';
import InstallSection from './settings/InstallSection.jsx';
import DangerSection from './settings/DangerSection.jsx';
import SettingsMenu from './settings/SettingsMenu.jsx';
import styles from './SettingsPage.module.css';

// Same width as the media query in SettingsPage.module.css and SettingsMenu.module.css
const ONE_COLUMN = '(max-width: 959px)';

const CONTENT = {
  profile: <ProfileSection />,
  security: (
    <>
      <PasswordSection />
      <SessionsSection />
    </>
  ),
  appearance: <AppearanceSection />,
  preferences: <PreferencesSection />,
  notifications: <NotificationSettings />,
  app: <InstallSection />,
  data: <DataSection />,
  danger: <DangerSection />,
};

// Settings, one section at a time. Every section has its own address: /settings/profile, /settings/security...
// Wide screen: the menu in a column on the left and the open section on the right; /settings opens Profile.
// Phone: /settings is the list of sections as cards, and a section has the page to itself with Back to that list.
// The demo account has no Security and Danger zone (the API answers 403): those addresses lead back to /settings.
export default function SettingsPage() {
  const { t } = useTranslation();
  const { section: sectionId } = useParams();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const oneColumn = useMediaQuery(ONE_COLUMN);

  const sections = visibleSections(user);
  const section = sections.find((item) => item.id === sectionId);

  if (sectionId && !section) return <Navigate to="/settings" replace />;
  if (!sectionId && !oneColumn) return <Navigate to={settingsPath(sections[0].id)} replace />;

  // Up one level: the list of sections. In two columns the first section already is /settings, so it leaves Settings.
  const backTo = oneColumn || section?.id !== sections[0].id ? '/settings' : '/';

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('nav.settings')}
        subtitle={t('settings.subtitle')}
        documentTitle={section ? t(settingsLabelKey(section.id)) : undefined}
      />

      {user?.isDemo && (
        <p className={styles.demoNote} role="note">
          <Icon name="info" size={18} />
          <span>{t('settings.demoNote')}</span>
        </p>
      )}

      <div className={styles.layout}>
        {(!oneColumn || !section) && <SettingsMenu sections={sections} />}

        {section && (
          <UnsavedChangesGuard>
            <div className={styles.content}>
              <BackButton to={backTo} />
              {/* A short fade when another section opens; the menu next to it stays where it is */}
              <motion.div
                key={section.id}
                className={styles.section}
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
              >
                {CONTENT[section.id]}
              </motion.div>
            </div>
          </UnsavedChangesGuard>
        )}
      </div>
    </div>
  );
}
