import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/axios.js';
import { isValidEmail } from '../utils/validators.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import PageTitle from '../components/PageTitle/PageTitle.jsx';
import TextField from '../components/TextField/TextField.jsx';
import Button from '../components/Button/Button.jsx';
import Alert from '../components/Alert/Alert.jsx';
import styles from './AuthForm.module.css';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useDocumentTitle(t('auth.logIn'));

  async function handleSubmit(event) {
    event.preventDefault();

    // Basic checks first; the server validates again.
    if (!isValidEmail(email)) return setError(t('auth.enterValidEmail'));
    if (!password) return setError(t('auth.enterPassword'));

    setError('');
    setSubmitting(true);
    try {
      // On success AuthContext stores the user and AuthLayout moves us to the Dashboard
      // (or to the page we were sent away from), so nothing else to do here.
      await login(email.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    // noValidate: the browser's own messages follow the browser language, so the checks above show their own.
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div>
        <PageTitle>{t('auth.welcomeBack')}</PageTitle>
        <p className={styles.subtitle}>{t('auth.loginSubtitle')}</p>
      </div>

      <TextField
        label={t('auth.email')}
        icon="mail"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label={t('auth.password')}
        icon="lock"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && <Alert>{error}</Alert>}

      <Button type="submit" block disabled={submitting}>
        {submitting ? t('auth.loggingIn') : t('auth.logIn')}
      </Button>

      <p className={styles.switch}>
        {t('auth.newHere')}{' '}
        <Link to="/register" className={styles.link}>
          {t('auth.createAnAccount')}
        </Link>
      </p>
    </form>
  );
}
