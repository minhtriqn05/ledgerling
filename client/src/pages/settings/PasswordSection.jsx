import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changePassword } from '../../api/users.js';
import { getErrorMessage } from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { passwordChangeProblem } from '../../utils/validators.js';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import TextField from '../../components/TextField/TextField.jsx';
import StrengthMeter from './StrengthMeter.jsx';
import styles from './Settings.module.css';

// Current password + new password twice. The server logs out every other device, and answers with a new token
// for this one: it is stored at once (saveSession), so the next request is already signed with it.
export default function PasswordSection() {
  const { t } = useTranslation();
  const { saveSession } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    // Basic checks first; the server validates again.
    const problem = passwordChangeProblem({ current, next, confirm });
    if (problem) return setError(t(problem));

    setError('');
    setSaving(true);
    try {
      saveSession(await changePassword(current, next));
      setCurrent('');
      setNext('');
      setConfirm('');
      toast.success(t('settings.password.changed'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader icon="lock" tone="periwinkle" title={t('settings.password.title')} subtitle={t('settings.password.text')} />
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label={t('settings.password.current')}
          icon="lock"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
        />
        <TextField
          label={t('settings.password.new')}
          icon="lock"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
        />
        <StrengthMeter password={next} />
        <p className={styles.hint}>{t('settings.password.hint')}</p>
        <TextField
          label={t('settings.password.confirm')}
          icon="lock"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />

        {error && <Alert>{error}</Alert>}
        <div className={styles.actions}>
          <Button needsNetwork type="submit" disabled={saving}>
            {saving ? t('settings.password.changing') : t('settings.password.submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
