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

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useDocumentTitle(t('auth.createAccount'));

  async function handleSubmit(event) {
    event.preventDefault();

    // Basic checks first; the server validates again.
    if (!name.trim()) return setError(t('auth.enterName'));
    if (!isValidEmail(email)) return setError(t('auth.enterValidEmail'));
    if (password.length < 6) return setError(t('auth.passwordShort'));

    setError('');
    setSubmitting(true);
    try {
      // The API signs the new user in right away, so AuthLayout moves us to the Dashboard.
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    // noValidate: the browser's own messages follow the browser language, so the checks above show their own.
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div>
        <PageTitle>{t('auth.createYourAccount')}</PageTitle>
        <p className={styles.subtitle}>{t('auth.registerSubtitle')}</p>
      </div>

      <TextField
        label={t('common.name')}
        icon="user"
        autoComplete="name"
        maxLength={50}
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
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
        autoComplete="new-password"
        minLength={6}
        maxLength={72}
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && <Alert>{error}</Alert>}

      <Button type="submit" block disabled={submitting}>
        {submitting ? t('auth.creatingAccount') : t('auth.createAccount')}
      </Button>

      <p className={styles.switch}>
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className={styles.link}>
          {t('auth.logIn')}
        </Link>
      </p>
    </form>
  );
}
