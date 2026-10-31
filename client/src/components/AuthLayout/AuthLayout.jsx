import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatSignedVnd, formatVnd } from '../../utils/format.js';
import Icon from '../Icon.jsx';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher.jsx';
import Logo from '../Logo/Logo.jsx';
import styles from './AuthLayout.module.css';

// Layout for the Login and Register pages: a gradient panel on the left, the page's form on the right.
// The form itself is rendered by <Outlet />. Design: LoginPreview in pages/styleGuide.

const weekBars = [30, 62, 22, 44, 100, 54, 34]; // bar heights in % of the tallest day

export default function AuthLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  // Already signed in (or just signed in): leave the login pages.
  // Go back to the page ProtectedRoute remembered in `state.from`, otherwise to the Dashboard.
  if (user) {
    return <Navigate to={location.state?.from ?? '/'} replace />;
  }

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <section className={styles.visual}>
          <div className={styles.brand}>
            <Logo size={36} inverse />
          </div>

          <div className={styles.pitch}>
            <p className={styles.headline}>{t('auth.pitchHeadline')}</p>
            <p className={styles.lead}>{t('auth.pitchLead')}</p>
          </div>

          {/* Decoration only: two small cards that hint at what the app shows. */}
          <div className={styles.floating} aria-hidden="true">
            <div className={`${styles.floatCard} ${styles.floatSaved}`}>
              <span className={styles.tile}>
                <Icon name="sprout" size={18} />
              </span>
              <div>
                <span className={styles.floatLabel}>{t('auth.savedThisMonth')}</span>
                <strong className={styles.income}>{formatSignedVnd(7900000, 'income')}</strong>
              </div>
            </div>

            <div className={`${styles.floatCard} ${styles.floatWeek}`}>
              <span className={styles.floatLabel}>{t('auth.thisWeek')}</span>
              <strong>{formatVnd(1855000)}</strong>
              <div className={styles.miniBars}>
                {weekBars.map((height, index) => (
                  <span key={index} className={height === 100 ? styles.miniPeak : ''} style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.formSide}>
          <LanguageSwitcher className={styles.language} />
          <Outlet />
        </section>
      </div>
    </main>
  );
}
