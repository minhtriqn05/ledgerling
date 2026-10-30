import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import ApiStatus from '../ApiStatus/ApiStatus.jsx';
import Icon from '../Icon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { navItems } from '../../config/navItems.js';
import styles from './AppLayout.module.css';

// Shared layout for signed-in pages: a sidebar on wide screens, a top bar with a menu button below 768px.
// The page itself is rendered by <Outlet />. The menu items come from config/navItems.js.

export default function AppLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false); // only matters on narrow screens
  const sidebarRef = useRef(null);

  // While the panel is open: Escape or a click outside closes it.
  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    function handlePointerDown(event) {
      if (!sidebarRef.current.contains(event.target)) setMenuOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [menuOpen]);

  // logout() removes the token from localStorage and clears the user in AuthContext.
  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar} ref={sidebarRef}>
        <div className={styles.bar}>
          <div className={styles.brand}>
            <span className={styles.logo}>L</span>
            Ledgerling
          </div>

          {/* Only visible on narrow screens */}
          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="main-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} />
          </button>
        </div>

        {/* A column inside the sidebar on wide screens, a dropdown panel on narrow ones */}
        <div id="main-menu" className={`${styles.panel} ${menuOpen ? styles.panelOpen : ''}`}>
          <nav className={styles.nav} aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.icon && <Icon name={item.icon} />}
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button type="button" className={`${styles.navItem} ${styles.logout}`} onClick={handleLogout}>
            <Icon name="logout" />
            Log out
          </button>
        </div>
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
