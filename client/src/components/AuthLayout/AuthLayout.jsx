import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Icon from '../Icon.jsx';
import styles from './AuthLayout.module.css';

// Layout for the Login and Register pages: a gradient panel on the left, the page's form on the right.
// The form itself is rendered by <Outlet />. Design: LoginPreview in pages/styleGuide.

const weekBars = [30, 62, 22, 44, 100, 54, 34]; // bar heights in % of the tallest day

export default function AuthLayout() {
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
            <span className={styles.logo}>L</span>
            Ledgerling
          </div>

          <div className={styles.pitch}>
            <p className={styles.headline}>Know where your money goes.</p>
            <p className={styles.lead}>Track income and expenses in a calm, simple way.</p>
          </div>

          {/* Decoration only: two small cards that hint at what the app shows. */}
          <div className={styles.floating} aria-hidden="true">
            <div className={`${styles.floatCard} ${styles.floatSaved}`}>
              <span className={styles.tile}>
                <Icon name="sprout" size={18} />
              </span>
              <div>
                <span className={styles.floatLabel}>Saved this month</span>
                <strong className={styles.income}>+7.900.000&nbsp;₫</strong>
              </div>
            </div>

            <div className={`${styles.floatCard} ${styles.floatWeek}`}>
              <span className={styles.floatLabel}>This week</span>
              <strong>1.855.000&nbsp;₫</strong>
              <div className={styles.miniBars}>
                {weekBars.map((height, index) => (
                  <span key={index} className={height === 100 ? styles.miniPeak : ''} style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.formSide}>
          <Outlet />
        </section>
      </div>
    </main>
  );
}
