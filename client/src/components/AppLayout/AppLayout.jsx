import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import ApiStatus from '../ApiStatus/ApiStatus.jsx';
import Avatar from '../Avatar/Avatar.jsx';
import Icon from '../Icon.jsx';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher.jsx';
import Logo from '../Logo/Logo.jsx';
import NotificationBell from '../Notifications/NotificationBell.jsx';
import QuickAddButton from '../QuickAdd/QuickAddButton.jsx';
import QuickAddDialog from '../QuickAdd/QuickAddDialog.jsx';
import ShortcutsDialog from '../QuickAdd/ShortcutsDialog.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { NotificationsProvider } from '../../context/NotificationsContext.jsx';
import { useHotkeys } from '../../hooks/useHotkeys.js';
import { navItems } from '../../config/navItems.js';
import styles from './AppLayout.module.css';

// Shared layout for signed-in pages: a sidebar on wide screens, a top bar with a menu button below 768px.
// The page itself is rendered by <Outlet />. The menu items come from config/navItems.js.
// It also holds what every signed-in page shares: the "+" button / N key (Quick add), and the shortcuts / and ?.

// The bell needs the number of unread notifications, which lives in NotificationsProvider.
export default function AppLayout() {
  return (
    <NotificationsProvider>
      <Layout />
    </NotificationsProvider>
  );
}

function Layout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false); // only matters on narrow screens
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Changing this key makes React build the open page again, so it loads its data again after a Quick add.
  const [pageKey, setPageKey] = useState(0);
  const sidebarRef = useRef(null);
  const navRef = useRef(null);
  // The sliding pill behind the open page's link. Measured from the link, so it fits any language and screen.
  const [indicator, setIndicator] = useState(null);

  useLayoutEffect(() => {
    function measure() {
      const active = navRef.current?.querySelector('[aria-current="page"]');
      setIndicator(active ? { top: active.offsetTop, height: active.offsetHeight } : null);
    }
    measure();
    // A closed phone menu measures 0, so going from a narrow to a wide window needs a new measurement
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [location.pathname, menuOpen, i18n.resolvedLanguage]);

  // "/" jumps to the search box of the Transactions page (and opens that page first if it is not the one shown)
  function focusSearch() {
    const input = document.querySelector('[data-hotkey-search]');
    if (input) input.focus();
    else navigate('/transactions', { state: { focusSearch: true } });
  }

  useHotkeys({
    n: () => setQuickAddOpen(true),
    '/': focusSearch,
    '?': () => setShortcutsOpen(true),
  });

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
            <Logo size={32} />
          </div>

          <div className={styles.barActions}>
            <NotificationBell />

            {/* Only visible on narrow screens */}
            <button
              type="button"
              className={styles.menuButton}
              aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={menuOpen}
              aria-controls="main-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Icon name={menuOpen ? 'x' : 'menu'} />
            </button>
          </div>
        </div>

        {/* A column inside the sidebar on wide screens, a dropdown panel on narrow ones */}
        <div id="main-menu" className={`${styles.panel} ${menuOpen ? styles.panelOpen : ''}`}>
          <nav className={styles.nav} ref={navRef} aria-label={t('nav.main')}>
            {indicator && <span className={styles.indicator} style={{ top: indicator.top, height: indicator.height }} aria-hidden="true" />}
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.icon && <Icon name={item.icon} />}
                <span className={styles.navLabel}>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </nav>

          <div className={styles.panelFooter}>
            {user && (
              <div className={styles.account} data-testid="account">
                <Avatar name={user.name} />
                <span className={styles.accountText}>
                  <strong className={styles.accountName} data-testid="account-name">
                    {user.name}
                  </strong>
                  <span className={styles.accountEmail}>{user.email}</span>
                </span>
              </div>
            )}
            <LanguageSwitcher className={styles.language} />
            <button type="button" className={`${styles.navItem} ${styles.logout}`} onClick={handleLogout}>
              <Icon name="logout" />
              <span className={styles.navLabel}>{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      <div className={styles.body}>
        <main className={styles.main}>
          {/* A short fade and an 8px slide when another page opens. No exit animation: the new page is there at once. */}
          <motion.div
            key={location.pathname}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <Outlet key={pageKey} />
          </motion.div>
        </main>
        <footer className={styles.footer}>
          <ApiStatus />
          <button type="button" className={styles.shortcutsLink} onClick={() => setShortcutsOpen(true)}>
            <kbd>?</kbd> {t('shortcuts.title')}
          </button>
        </footer>
      </div>

      <QuickAddButton onClick={() => setQuickAddOpen(true)} />
      <AnimatePresence>
        {quickAddOpen && (
          <QuickAddDialog key="quick-add" onSaved={() => setPageKey((key) => key + 1)} onClose={() => setQuickAddOpen(false)} />
        )}
        {shortcutsOpen && <ShortcutsDialog key="shortcuts" onClose={() => setShortcutsOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
