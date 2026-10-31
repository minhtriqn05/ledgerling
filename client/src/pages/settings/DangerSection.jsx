import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { deleteAccount } from '../../api/users.js';
import { getErrorMessage } from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { DELETE_WORD } from '../../utils/validators.js';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import TextField from '../../components/TextField/TextField.jsx';
import styles from './Settings.module.css';

// Delete the account and all its data. The button stays off until the word DELETE is typed (exactly, in capitals)
// and a password is entered; the server checks the password. When it is done the person is logged out.
//
// A browser sees "a text field, then a password field" as a login form and fills in the saved email and password.
// new-password says this is not a login, so nothing saved is filled in; the form and the word field also ask for
// no autofill, and their own names keep the browser from matching them with a saved email or username.
// The data-* attributes do the same for the password manager extensions (1Password, LastPass, Bitwarden).
const NO_PASSWORD_MANAGER = { 'data-1p-ignore': 'true', 'data-lpignore': 'true', 'data-bwignore': 'true', 'data-form-type': 'other' };

export default function DangerSection() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [word, setWord] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = word === DELETE_WORD && password.length > 0;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!ready || busy) return;

    setError('');
    setBusy(true);
    try {
      await deleteAccount(password);
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
      return;
    }
    logout();
    navigate('/login', { replace: true });
    toast.success(t('settings.danger.deleted'));
  }

  return (
    <Card className={styles.danger}>
      <CardHeader icon="alert" tone="coral" title={t('settings.danger.title')} />
      <p className={styles.dangerText}>{t('settings.danger.text')}</p>
      <form className={styles.form} onSubmit={handleSubmit} autoComplete="off" noValidate>
        <TextField
          label={t('settings.danger.typeToConfirm', { word: DELETE_WORD })}
          name="delete-confirmation"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          value={word}
          onChange={(event) => setWord(event.target.value)}
          {...NO_PASSWORD_MANAGER}
        />
        <TextField
          label={t('settings.danger.password')}
          icon="lock"
          type="password"
          name="delete-account-password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          {...NO_PASSWORD_MANAGER}
        />

        {error && <Alert>{error}</Alert>}
        <div className={styles.actions}>
          <Button needsNetwork type="submit" variant="danger" icon="trash" disabled={!ready || busy}>
            {busy ? t('settings.danger.deleting') : t('settings.danger.submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
