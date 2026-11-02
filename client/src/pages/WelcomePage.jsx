import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/axios.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useSpotlight } from '../hooks/useSpotlight.js';
import { formatCompact, formatPercent, formatVnd } from '../utils/format.js';
import Alert from '../components/Alert/Alert.jsx';
import Aurora from '../components/Aurora/Aurora.jsx';
import Icon from '../components/Icon.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher/LanguageSwitcher.jsx';
import LegalLinks from '../components/LegalLinks/LegalLinks.jsx';
import LoadingState from '../components/LoadingState/LoadingState.jsx';
import Logo from '../components/Logo/Logo.jsx';
import Reveal from '../components/Motion/Reveal.jsx';
import styles from './WelcomePage.module.css';

// The public landing page (/welcome). A visitor who opens the site lands here (ProtectedRoute sends "/" to it);
// a signed-in user can open it too (the logo in the sidebar and the breadcrumb lead here) and sees "Open app" instead of
// Log in and Get started. "Try the demo" signs in to the shared demo account with one click.
// The whole page is Noir in both themes (data-tone): it is the first thing anybody sees of Ledgerling.
// All the text is in locales/*.json under "welcome".

const GITHUB_URL = 'https://github.com/minhtriqn05/ledgerling';

// The six cards of the bento grid: the key of their text in "welcome.features", an icon from components/Icon.jsx,
// and how wide they are. Each one has a small drawing of what it does (the Preview functions below).
const FEATURES = [
  { key: 'transactions', icon: 'transactions', wide: true, Preview: QuickAddPreview },
  { key: 'budgets', icon: 'gauge', Preview: BudgetPreview },
  { key: 'recurring', icon: 'repeat', Preview: RecurringPreview },
  { key: 'goals', icon: 'target', Preview: GoalPreview },
  { key: 'reports', icon: 'reports', Preview: ReportPreview },
  { key: 'devices', icon: 'monitor', full: true, Preview: DevicesPreview },
];

const STEPS = ['signUp', 'addMoney', 'seePicture'];
const TRUST = [
  { key: 'languages', icon: 'globe' },
  { key: 'install', icon: 'smartphone' },
  { key: 'sync', icon: 'repeat' },
  { key: 'themes', icon: 'moon' },
];

// The pictures are taken from the demo account by e2e/screenshots.capture.js (npm run screenshots) and saved in
// assets/screenshots. A picture that does not exist (yet) is left out, so the page never shows a broken image.
const SHOT_SIZE = { width: 1440, height: 900 };
const SHOT_KEYS = ['dashboard', 'transactions', 'budgets', 'goals'];
const shotFiles = import.meta.glob('../assets/screenshots/*.jpg', { eager: true, query: '?url', import: 'default' });
const shotOf = (key) => shotFiles[`../assets/screenshots/${key}.jpg`];

// ---------- Small drawings inside the cards. Decoration only: the text of the card says the same. ----------

function QuickAddPreview() {
  const { t } = useTranslation();
  return (
    <div className={styles.previewQuick}>
      <span className={styles.previewInput}>
        <Icon name="plus" size={16} />
        {t('quickAdd.placeholder')}
        <i className={styles.caret} />
      </span>
      <span className={styles.previewRow}>
        <span className={styles.previewMark}>
          <Icon name="transactions" size={16} />
        </span>
        <b>−{formatVnd(35000)}</b>
      </span>
    </div>
  );
}

function BudgetPreview() {
  return (
    <div className={styles.previewBars}>
      {[
        { percent: 53, tone: 'var(--color-income)' },
        { percent: 89, tone: 'var(--accent-sun)' },
        { percent: 100, label: 132, tone: 'var(--color-expense)' },
      ].map(({ percent, label, tone }) => (
        <span key={tone} className={styles.previewBar}>
          <span style={{ width: `${percent}%`, background: tone }} />
          <small>{formatPercent(label ?? percent)}</small>
        </span>
      ))}
    </div>
  );
}

function RecurringPreview() {
  return (
    <div className={styles.previewDots}>
      {Array.from({ length: 28 }, (_, day) => (
        <i key={day} className={day === 0 || day === 14 ? styles.dotOn : ''} />
      ))}
    </div>
  );
}

function GoalPreview() {
  const circumference = 2 * Math.PI * 34;
  return (
    <div className={styles.previewRing}>
      <svg viewBox="0 0 84 84" width="84" height="84">
        <circle cx="42" cy="42" r="34" fill="none" stroke="var(--chart-bar-track)" strokeWidth="9" />
        <circle
          cx="42"
          cy="42"
          r="34"
          fill="none"
          stroke="var(--color-income)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.62} ${circumference}`}
          transform="rotate(-90 42 42)"
        />
      </svg>
      <strong>{formatPercent(62)}</strong>
    </div>
  );
}

function ReportPreview() {
  const months = [34, 52, 41, 68, 58, 100];
  return (
    <div className={styles.previewCapsules}>
      {months.map((height, index) => (
        <span key={index} className={styles.capsuleTrack}>
          <span className={index === months.length - 1 ? styles.capsuleNow : ''} style={{ height: `${height}%` }} />
        </span>
      ))}
      <small>{formatCompact(6400000)}</small>
    </div>
  );
}

function DevicesPreview() {
  return (
    <div className={styles.previewLanguages}>
      {['EN', 'VI', 'FR', 'DE', 'ES', '中文', '日本語', '한국어'].map((language) => (
        <span key={language}>{language}</span>
      ))}
    </div>
  );
}

// The picture of the app under the headline. It lies back a little and stands up while the page scrolls.
function ProductFrame() {
  const frameRef = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: frameRef, offset: ['start end', 'start 35%'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [16, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);

  return (
    <div className={styles.frameStage} ref={frameRef}>
      <motion.div className={styles.frame} style={reduced ? undefined : { rotateX, scale }}>
        <span className={styles.frameBar} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        {/* The same picture has its description in "See it in action" below */}
        <img src={shotOf('dashboard')} alt="" width={SHOT_SIZE.width} height={SHOT_SIZE.height} decoding="async" fetchPriority="high" />
      </motion.div>
    </div>
  );
}

export default function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading, loginAsDemo } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  useDocumentTitle(t('welcome.documentTitle'));
  useSpotlight();

  // A stored token is still being checked: do not show the wrong buttons for a moment
  if (loading) return <LoadingState fullScreen />;

  async function handleDemo() {
    setError('');
    setStarting(true);
    try {
      await loginAsDemo();
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setStarting(false);
    }
  }

  const shots = SHOT_KEYS.filter(shotOf);

  return (
    <div className={styles.page} data-tone="noir">
      <header className={styles.header}>
        <Link to="/welcome" className={styles.brand}>
          <Logo size={32} />
        </Link>
        <div className={styles.headerActions}>
          <LanguageSwitcher />
          {user ? (
            <Link to="/" className={styles.headerLink}>
              {t('welcome.openApp')}
            </Link>
          ) : (
            <Link to="/login" className={styles.headerLink}>
              {t('auth.logIn')}
            </Link>
          )}
        </div>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="welcome-title">
          <Aurora className={styles.heroAurora} />
          <Reveal className={styles.heroInner}>
            <p className={`eyebrow ${styles.eyebrow}`}>{t('welcome.eyebrow')}</p>
            <h1 id="welcome-title" className={styles.title}>
              {t('auth.pitchHeadline')}
            </h1>
            <p className={styles.lead}>{t('welcome.lead')}</p>

            {user ? (
              <div className={styles.actions}>
                <Link to="/" className={`${styles.cta} ${styles.primary}`}>
                  {t('welcome.openApp')}
                  <Icon name="arrowRight" size={18} />
                </Link>
              </div>
            ) : (
              <>
                <div className={styles.actions}>
                  <Link to="/register" className={`${styles.cta} ${styles.primary}`}>
                    {t('welcome.getStarted')}
                    <Icon name="arrowRight" size={18} />
                  </Link>
                  <button type="button" className={`${styles.cta} ${styles.secondary}`} onClick={handleDemo} disabled={starting}>
                    <Icon name="sprout" size={18} />
                    {t('welcome.tryDemo')}
                  </button>
                </div>

                {/* Always in the page, so a screen reader announces the text when it appears */}
                <p className={styles.demoStatus} role="status">
                  {starting ? t('welcome.demoStarting') : ''}
                </p>
                {error && <Alert>{error}</Alert>}
                {!starting && !error && <p className={styles.hint}>{t('welcome.demoHint')}</p>}
              </>
            )}
          </Reveal>

          {shotOf('dashboard') && <ProductFrame />}
        </section>

        <ul className={styles.trust} aria-label={t('welcome.trust.label')}>
          {TRUST.map((item) => (
            <li key={item.key}>
              <Icon name={item.icon} size={18} />
              {t(`welcome.trust.${item.key}`)}
            </li>
          ))}
        </ul>

        <section className={styles.section} aria-labelledby="welcome-features">
          <h2 id="welcome-features" className={styles.sectionTitle}>
            {t('welcome.featuresTitle')}
          </h2>
          <ul className={styles.features}>
            {FEATURES.map(({ key, icon, wide, full, Preview }, index) => (
              <Reveal
                as="li"
                onScroll
                index={index}
                key={key}
                className={`${styles.feature} ${wide ? styles.featureWide : ''} ${full ? styles.featureFull : ''}`}
                data-spot
              >
                <div className={styles.featureText}>
                  <span className={styles.featureIcon} aria-hidden="true">
                    <Icon name={icon} size={20} />
                  </span>
                  <h3>{t(`welcome.features.${key}.title`)}</h3>
                  <p>{t(`welcome.features.${key}.text`)}</p>
                </div>
                <div className={styles.featurePreview} aria-hidden="true">
                  <Preview />
                </div>
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
              {shots.map((key, index) => (
                <Reveal as="li" onScroll index={index} key={key}>
                  <figure className={styles.shot}>
                    <img
                      src={shotOf(key)}
                      alt={t(`welcome.shots.${key}.alt`)}
                      width={SHOT_SIZE.width}
                      height={SHOT_SIZE.height}
                      loading="lazy"
                      decoding="async"
                    />
                    <figcaption>{t(`welcome.shots.${key}.caption`)}</figcaption>
                  </figure>
                </Reveal>
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
              <Reveal as="li" onScroll index={index} key={key} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{t(`welcome.steps.${key}.title`)}</h3>
                <p>{t(`welcome.steps.${key}.text`)}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        {!user && (
          <section className={styles.closing} aria-labelledby="welcome-closing">
            <Aurora />
            <div className={styles.closingInner}>
              <h2 id="welcome-closing">{t('welcome.closing.title')}</h2>
              <p>{t('welcome.closing.text')}</p>
              <Link to="/register" className={`${styles.cta} ${styles.primary}`}>
                {t('auth.createAnAccount')}
                <Icon name="arrowRight" size={18} />
              </Link>
            </div>
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <Logo size={26} />
        <p>{t('welcome.footerNote')}</p>
        <LegalLinks className={styles.legalLinks} linkClassName={styles.footerLink} />
        <a href={GITHUB_URL} className={styles.footerLink} target="_blank" rel="noopener noreferrer">
          {t('welcome.github')}
          <span className={styles.srOnly}> {t('welcome.opensInNewTab')}</span>
        </a>
      </footer>
    </div>
  );
}
