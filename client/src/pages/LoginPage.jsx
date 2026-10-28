import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/axios.js';
import { isValidEmail } from '../utils/validators.js';
import PageTitle from '../components/PageTitle/PageTitle.jsx';
import TextField from '../components/TextField/TextField.jsx';
import Button from '../components/Button/Button.jsx';
import Alert from '../components/Alert/Alert.jsx';
import styles from './AuthForm.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    // Basic checks first; the server validates again.
    if (!isValidEmail(email)) return setError('Please enter a valid email address.');
    if (!password) return setError('Please enter your password.');

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
    // noValidate: the browser's own messages follow the browser language, so the checks above show English ones.
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div>
        <PageTitle>Welcome back</PageTitle>
        <p className={styles.subtitle}>Log in to keep tracking your spending.</p>
      </div>

      <TextField
        label="Email"
        icon="mail"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Password"
        icon="lock"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && <Alert>{error}</Alert>}

      <Button type="submit" block disabled={submitting}>
        {submitting ? 'Logging in…' : 'Log in'}
      </Button>

      <p className={styles.switch}>
        New to Ledgerling?{' '}
        <Link to="/register" className={styles.link}>
          Create an account
        </Link>
      </p>
    </form>
  );
}
