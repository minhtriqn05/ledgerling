import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logoutAllDevices } from '../../api/users.js';
import { getErrorMessage } from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Button from '../../components/Button/Button.jsx';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import styles from './Settings.module.css';

// "Log out of all other devices". The API raises the token version, which ends every session, and sends a new
// token for this device, so the person stays signed in here.
export default function SessionsSection() {
  const { t } = useTranslation();
  const { saveSession } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      saveSession(await logoutAllDevices());
      toast.success(t('settings.sessions.done'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader icon="shield" tone="mint" title={t('settings.sessions.title')} subtitle={t('settings.sessions.text')} />
      <div className={styles.actions}>
        <Button needsNetwork variant="secondary" icon="logout" onClick={handleClick} disabled={busy}>
          {busy ? t('settings.sessions.working') : t('settings.sessions.logoutOthers')}
        </Button>
      </div>
    </Card>
  );
}
