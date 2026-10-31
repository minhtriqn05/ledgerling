import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updateProfile } from '../../api/users.js';
import { getErrorMessage } from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import TextField from '../../components/TextField/TextField.jsx';
import AvatarPicker from './AvatarPicker.jsx';
import styles from './Settings.module.css';

// The avatar (AvatarPicker) and the name (the email is the login, so it cannot change). Without an avatar the menu shows
// the first letter of the name. The new name shows in the menu as soon as it is saved.
export default function ProfileSection() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const trimmed = name.trim();

  async function handleSubmit(event) {
    event.preventDefault();
    if (!trimmed) return setError(t('auth.enterName'));

    setError('');
    setSaving(true);
    try {
      updateUser(await updateProfile(trimmed));
      setName(trimmed);
      toast.success(t('settings.profile.saved'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader icon="user" tone="sky" title={t('settings.profile.title')} subtitle={t('settings.profile.text')} />
      <AvatarPicker />
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label={t('common.name')}
          icon="user"
          autoComplete="name"
          maxLength={50}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField label={t('auth.email')} icon="mail" type="email" value={user.email} readOnly />
        <p className={styles.hint}>{t('settings.profile.emailHint')}</p>

        {error && <Alert>{error}</Alert>}
        <div className={styles.actions}>
          <Button needsNetwork type="submit" disabled={saving || trimmed === user.name}>
            {saving ? t('common.saving') : t('common.saveChanges')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
