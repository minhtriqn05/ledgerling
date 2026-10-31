import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updatePreferences } from '../../api/users.js';
import { getErrorMessage } from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl.jsx';
import styles from './Settings.module.css';

// The first day of the week (the calendar in Reports uses it). It moves at once and is saved on the account;
// if the account cannot be reached, it moves back. The notification switches are in their own card below this one.
export default function PreferencesSection() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState(null);
  const saved = user?.preferences?.weekStartsOn === 'sunday' ? 'sunday' : 'monday';

  async function choose(value) {
    if (value === (pending ?? saved)) return;
    setPending(value);
    try {
      updateUser(await updatePreferences({ weekStartsOn: value }));
      toast.success(t('settings.preferences.saved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader icon="calendar" tone="teal" title={t('settings.preferences.title')} subtitle={t('settings.preferences.text')} />
      <div className={styles.group}>
        <span className={styles.label}>
          {t('settings.preferences.weekStartsOn')}
        </span>
        <SegmentedControl
          label={t('settings.preferences.weekStartsOn')}
          value={pending ?? saved}
          onChange={choose}
          options={[
            { value: 'monday', label: t('settings.preferences.monday') },
            { value: 'sunday', label: t('settings.preferences.sunday') },
          ]}
        />
        <p className={styles.hint}>{t('settings.preferences.weekHint')}</p>
      </div>
    </Card>
  );
}
