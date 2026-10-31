import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/axios.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import Alert from '../components/Alert/Alert.jsx';
import Icon from '../components/Icon.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher/LanguageSwitcher.jsx';
import LoadingState from '../components/LoadingState/LoadingState.jsx';
import Logo from '../components/Logo/Logo.jsx';
import Reveal from '../components/Motion/Reveal.jsx';
import styles from './WelcomePage.module.css';

// The public landing page (/welcome). A visitor who opens the site lands here (ProtectedRoute sends "/" to it);
// a signed-in user is sent to the Dashboard. "Try the demo" signs in to the shared demo account with one click.
// All the text is in locales/*.json under "welcome".

const GITHUB_URL = 'https://github.com/minhtriqn05/ledgerling';

// The six cards: the key of their text in "welcome.features" and an icon from components/Icon.jsx
const FEATURES = [
  { key: 'transactions', icon: 'transactions' },
  { key: 'budgets', icon: 'wallet' },
  { key: 'recurring', icon: 'repeat' },
  { key: 'goals', icon: 'target' },
  { key: 'reports', icon: 'reports' },
  { key: 'devices', icon: 'monitor' },
];

const STEPS = ['signUp', 'addMoney', 'seePicture'];

// The pictures are taken from the demo account by e2e/screenshots.spec.js (npm run screenshots) and saved in
// assets/screenshots. A picture that does not exist (yet) is left out, so the page never shows a broken image.
const SHOT_SIZE = { width: 1280, height: 800 };
const SHOT_KEYS = ['dashboard', 'transactions', 'budgets', 'goals'];
const shotFiles = import.meta.glob('../assets/screenshots/*.jpg', { eager: true, query: '?url', import: 'default' });

export default function WelcomePage() {
  const { t } = useTranslation();
  const { user, loading, loginAsDemo } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  useDocumentTitle(t('welcome.documentTitle'));

  // A stored token is still being checked: do not flash the page at someone who is already signed in
  if (loading) return <LoadingState fullScreen />;
  if (user) return <Navigate to="/" replace />;

  async function handleDemo() {
    setError('');
    setStarting(true);
    try {
      // On success AuthContext stores the user and the check above moves us to the Dashboard
      await loginAsDemo();
    } catch (err) {
      setError(getErrorMessage(err));
      setStarting(false);
    }
  }

  const shots = SHOT_KEYS.filter((key) => shotFiles[`../assets/screenshots/${key}.jpg`]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/welcome" className={styles.brand}>
          <Logo size={34} />
        </Link>
        <div className={styles.headerActions}>
          <LanguageSwitcher />
          <Link to="/login" className={styles.headerLink}>
            {t('auth.logIn')}
          </Link>
        </div>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="welcome-title">
          <p className={styles.eyebrow}>{t('welcome.eyebrow')}</p>
          <h1 id="welcome-title" className={styles.title}>
            {t('auth.pitchHeadline')}
          </h1>
          <p className={styles.lead}>{t('welcome.lead')}</p>

          <div className={styles.actions}>
            <Link to="/register" className={`${styles.cta} ${styles.primary}`}>
              {t('welcome.getStarted')}
            </Link>
            <button type="button" className={`${styles.cta} ${styles.secondary}`} onClick={handleDemo} disabled={starting}>
              <Icon name="sprout" size={18} />
              {t('welcome.tryDemo')}
            </button>
            <Link to="/login" className={`${styles.cta} ${styles.ghost}`}>
              {t('auth.logIn')}
            </Link>
          </div>

          {/* Always in the page, so a screen reader announces the text when it appears */}
          <p className={styles.demoStatus} role="status">
            {starting ? t('welcome.demoStarting') : ''}
          </p>
          {error && <Alert>{error}</Alert>}
          {!starting && !error && <p className={styles.hint}>{t('welcome.demoHint')}</p>}
        </section>

        <section className={styles.section} aria-labelledby="welcome-features">
          <h2 id="welcome-features" className={styles.sectionTitle}>
            {t('welcome.featuresTitle')}
          </h2>
          <ul className={styles.features}>
            {FEATURES.map((feature, index) => (
              <Reveal as="li" index={index} key={feature.key} className={styles.feature}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <Icon name={feature.icon} size={22} />
                </span>
                <h3>{t(`welcome.features.${feature.key}.title`)}</h3>
                <p>{t(`welcome.features.${feature.key}.text`)}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        {shots.length > 0 && (
          <section className={styles.section} aria-labelledby="welcome-shots">
            <h2 id="welcome-shots" className={styles.sectionTitle}>
              {t('welcome.shotsTitle')}
            </h2>
            <ul className={styles.shots}>
              {shots.map((key) => (
                <li key={key}>
                  <figure className={styles.shot}>
                    <img
                      src={shotFiles[`../assets/screenshots/${key}.jpg`]}
                      alt={t(`welcome.shots.${key}.alt`)}
                      width={SHOT_SIZE.width}
                      height={SHOT_SIZE.height}
                      loading="lazy"
                      decoding="async"
                    />
                    <figcaption>{t(`welcome.shots.${key}.caption`)}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.section} aria-labelledby="welcome-how">
          <h2 id="welcome-how" className={styles.sectionTitle}>
            {t('welcome.howTitle')}
          </h2>
          <ol className={styles.steps}>
            {STEPS.map((key, index) => (
              <li key={key} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{t(`welcome.steps.${key}.title`)}</h3>
                <p>{t(`welcome.steps.${key}.text`)}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className={styles.footer}>
        <Logo size={26} />
        <p>{t('welcome.footerNote')}</p>
        <a href={GITHUB_URL} className={styles.footerLink} target="_blank" rel="noopener noreferrer">
          {t('welcome.github')}
          <span className={styles.srOnly}> {t('welcome.opensInNewTab')}</span>
        </a>
      </footer>
    </div>
  );
}
