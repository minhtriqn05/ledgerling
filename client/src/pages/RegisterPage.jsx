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

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    // Basic checks first; the server validates again.
    if (!name.trim()) return setError('Please enter your name.');
    if (!isValidEmail(email)) return setError('Please enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');

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
    // noValidate: the browser's own messages follow the browser language, so the checks above show English ones.
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div>
        <PageTitle>Create your account</PageTitle>
        <p className={styles.subtitle}>Start tracking your income and expenses.</p>
      </div>

      <TextField
        label="Name"
        icon="user"
        autoComplete="name"
        maxLength={50}
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
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
        autoComplete="new-password"
        minLength={6}
        maxLength={72}
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && <Alert>{error}</Alert>}

      <Button type="submit" block disabled={submitting}>
        {submitting ? 'Creating account…' : 'Create account'}
      </Button>

      <p className={styles.switch}>
        Already have an account?{' '}
        <Link to="/login" className={styles.link}>
          Log in
        </Link>
      </p>
    </form>
  );
}
