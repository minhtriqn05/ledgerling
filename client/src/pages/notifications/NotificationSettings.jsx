import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updateNotificationSettings } from '../../api/notifications.js';
import { getErrorMessage } from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import Icon from '../../components/Icon.jsx';
import { NOTIFICATION_SWITCHES } from '../../utils/notifications.js';
import styles from './NotificationSettings.module.css';

// One switch per kind of notification. A kind that is off is never created by the server.
// A switch saves as soon as it is clicked and moves at once; if the server refuses, it moves back.
export default function NotificationSettings() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const toast = useToast();
  // Switches that were clicked and are being saved: { budget: false }
  const [pending, setPending] = useState({});

  // An account without the field counts as all on
  const isOn = (key) => pending[key] ?? user?.preferences?.notifications?.[key] !== false;

  function clearPending(key) {
    setPending((current) => {
      const { [key]: _done, ...rest } = current;
      return rest;
    });
  }

  async function handleChange(key, checked) {
    setPending((current) => ({ ...current, [key]: checked }));
    try {
      updateUser(await updateNotificationSettings({ [key]: checked }));
      toast.success(t('notifications.settingsSaved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      clearPending(key);
    }
  }

  return (
    <Card>
      <CardHeader icon="bell" tone="sky" title={t('notifications.settingsTitle')} subtitle={t('notifications.settingsText')} />
      <ul className={styles.list}>
        {NOTIFICATION_SWITCHES.map(({ key, icon }) => (
          <li key={key}>
            <label className={styles.row}>
              <span className={styles.icon} aria-hidden="true">
                <Icon name={icon} size={18} />
              </span>
              <span className={styles.text}>
                <span className={styles.label}>{t(`notifications.settings.${key}`)}</span>
                <span className={styles.hint}>{t(`notifications.settings.${key}Hint`)}</span>
              </span>
              <input type="checkbox" checked={isOn(key)} onChange={(event) => handleChange(key, event.target.checked)} />
            </label>
          </li>
        ))}
      </ul>
    </Card>
  );
}
