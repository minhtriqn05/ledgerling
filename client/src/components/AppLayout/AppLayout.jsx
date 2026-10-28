import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import ApiStatus from '../ApiStatus/ApiStatus.jsx';
import Icon from '../Icon.jsx';
import styles from './AppLayout.module.css';

// Shared layout for signed-in pages: a sidebar on desktop, a bottom tab bar on phones.
// The page itself is rendered by <Outlet />.

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/transactions', label: 'Transactions', icon: 'transactions' },
  { to: '/categories', label: 'Categories', icon: 'categories' },
];

export default function AppLayout() {
  const navigate = useNavigate();

  // The token lives in localStorage (see CLAUDE.md), so logging out means removing it.
  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo}>L</span>
          Ledgerling
        </div>

        <nav className={styles.nav} aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className={`${styles.navItem} ${styles.logout}`} onClick={handleLogout}>
          <Icon name="logout" />
          Log out
        </button>
      </aside>

      <div className={styles.body}>
        <main className={styles.main}>
          <Outlet />
        </main>
        <footer className={styles.footer}>
          <ApiStatus />
        </footer>
      </div>
    </div>
  );
}
