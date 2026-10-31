import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import ApiStatus from '../ApiStatus/ApiStatus.jsx';
import Avatar from '../Avatar/Avatar.jsx';
import Breadcrumbs from '../Breadcrumbs/Breadcrumbs.jsx';
import CommandPalette from '../CommandPalette/CommandPalette.jsx';
import Icon from '../Icon.jsx';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher.jsx';
import LiveStatus from '../LiveStatus/LiveStatus.jsx';
import LoadingState from '../LoadingState/LoadingState.jsx';
import Logo from '../Logo/Logo.jsx';
import NotificationBell from '../Notifications/NotificationBell.jsx';
import OfflineBanner from '../OfflineBanner/OfflineBanner.jsx';
import QuickAddButton from '../QuickAdd/QuickAddButton.jsx';
import QuickAddDialog from '../QuickAdd/QuickAddDialog.jsx';
import ShortcutsDialog from '../QuickAdd/ShortcutsDialog.jsx';
import SessionExpiredDialog from '../SessionExpiredDialog/SessionExpiredDialog.jsx';
import Tour from '../Tour/Tour.jsx';
import UserMenu from '../UserMenu/UserMenu.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { BreadcrumbProvider } from '../../context/BreadcrumbContext.jsx';
import { NotificationsProvider } from '../../context/NotificationsContext.jsx';
import { SocketProvider } from '../../context/SocketContext.jsx';
import { useCommandKey, useHotkeys } from '../../hooks/useHotkeys.js';
import { NARROW_SCREEN, useMediaQuery } from '../../hooks/useMediaQuery.js';
import { useStoredBoolean } from '../../hooks/useStoredBoolean.js';
import { useTour } from '../../hooks/useTour.js';
import { navItems } from '../../config/navItems.js';
import styles from './AppLayout.module.css';

const SIDEBAR_KEY = 'ledgerling.sidebarCollapsed';

// Shared layout for signed-in pages: a sidebar on wide screens, a top bar with a menu button below 768px.
// The page itself is rendered by <Outlet />. The menu items come from config/navItems.js.
// It also holds what every signed-in page shares: the "+" button / N key (Quick add), the shortcuts / and ? and [,
// the command palette (Ctrl+K), the guided tour and the "Session expired" dialog.

// The bell needs the number of unread notifications, which lives in NotificationsProvider.
// SocketProvider opens the real-time connection; this layout is only on screen for a signed-in user.
export default function AppLayout() {
  return (
    <SocketProvider>
      <NotificationsProvider>
        <BreadcrumbProvider>
          <Layout />
        </BreadcrumbProvider>
      </NotificationsProvider>
    </SocketProvider>
  );
}

// The sections of Settings share one page: the menu next to them must not fade when another one opens
const pageKeyOf = (pathname) => (pathname.startsWith('/settings') ? '/settings' : pathname);

function Layout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();
  const { user, logout, sessionExpired } = useAuth();
  const narrow = useMediaQuery(NARROW_SCREEN);
  const [collapsedChoice, setCollapsedChoice] = useStoredBoolean(SIDEBAR_KEY);
  const collapsed = collapsedChoice && !narrow; // a phone has the top bar instead of a sidebar
  const [menuOpen, setMenuOpen] = useState(false); // only matters on narrow screens
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const tour = useTour();
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
  }, [location.pathname, menuOpen, i18n.resolvedLanguage, collapsed]);

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
    '[': () => setCollapsedChoice((value) => !value),
  });

  // Ctrl+K: also while typing in a field, but never on top of another dialog
  useCommandKey(() => setPaletteOpen((open) => (open ? false : !document.querySelector('dialog[open]'))));

  // The "Add transaction" shortcut of the installed app opens /?quickAdd=1 (see the manifest in vite.config.js).
  // The address is cleaned up at once, so a page reload does not open the dialog again.
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('quickAdd')) return;
    setQuickAddOpen(true);
    navigate(location.pathname, { replace: true });
  }, [location.search, location.pathname, navigate]);

  // While the panel is open: Escape or a click outside closes it. The tour may open it and has its own buttons outside it.
  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    function handlePointerDown(event) {
      if (!sidebarRef.current.contains(event.target) && !event.target.closest?.('[data-keep-menu]')) setMenuOpen(false);
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

  function closeTour() {
    tour.finish();
    if (narrow) setMenuOpen(false);
  }

  return (
    <div className={`${styles.layout} ${collapsed ? styles.collapsed : ''}`} data-sidebar={collapsed ? 'collapsed' : 'open'}>
      <aside className={styles.sidebar} ref={sidebarRef}>
        <div className={styles.bar}>
          <div className={styles.brand}>
            {/* The way back to the landing page, also for somebody who is signed in */}
            <Link to="/welcome" className={styles.logoLink} title={t('nav.toWelcome')} data-testid="sidebar-logo">
              <Logo size={32} showName={!collapsed} />
            </Link>
            <LiveStatus />
          </div>

          <div className={styles.barActions}>
            <NotificationBell />
            {/* The top bar of a phone: the face of the account, a shortcut to the profile */}
            {user && (
              <NavLink to="/settings" className={styles.barAvatar} aria-label={t('avatar.openProfile')} data-testid="bar-avatar">
                <Avatar name={user.name} avatar={user.avatar} />
              </NavLink>
            )}

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
          <button
            type="button"
            className={`${styles.navItem} ${styles.searchButton}`}
            data-tooltip={t('commandPalette.open')}
            onClick={() => {
              setMenuOpen(false);
              setPaletteOpen(true);
            }}
          >
            <Icon name="search" />
            <span className={styles.navLabel}>{t('commandPalette.open')}</span>
            <kbd className={styles.searchKey} aria-hidden="true">
              {/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'}
            </kbd>
          </button>

          <nav className={styles.nav} ref={navRef} aria-label={t('nav.main')}>
            {indicator && <span className={styles.indicator} style={{ top: indicator.top, height: indicator.height }} aria-hidden="true" />}
            {navItems.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
                data-tooltip={t(item.labelKey)}
                data-tour={`nav:${item.path}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.icon && <Icon name={item.icon} />}
                <span className={styles.navLabel}>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </nav>

          <div className={styles.panelFooter}>
            <div className={styles.footerRow}>
              <LanguageSwitcher className={styles.language} />
              {/* The small button that folds the sidebar; a phone has no sidebar to fold */}
              <button
                type="button"
                className={styles.collapseButton}
                aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
                aria-expanded={!collapsed}
                data-tooltip={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
                data-testid="sidebar-toggle"
                onClick={() => setCollapsedChoice((value) => !value)}
              >
                <Icon name={collapsed ? 'chevronsRight' : 'chevronsLeft'} size={18} />
              </button>
            </div>
            {user && (
              <UserMenu
                user={user}
                onShortcuts={() => setShortcutsOpen(true)}
                onTour={tour.start}
                onLogout={handleLogout}
                onLeave={() => setMenuOpen(false)}
              />
            )}
          </div>
        </div>
      </aside>

      <div className={styles.body}>
        <main className={styles.main}>
          <OfflineBanner />
          {/* "Home / Reports / Monthly", made from the address (config/breadcrumbs.js) */}
          <Breadcrumbs />
          {/* A short fade and an 8px slide when another page opens. No exit animation: the new page is there at once. */}
          <motion.div
            key={pageKeyOf(location.pathname)}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
          >
            {/* The page is downloaded the first time it opens (see App.jsx); the sidebar stays on screen meanwhile */}
            <Suspense fallback={<LoadingState spacious />}>
              <Outlet key={pageKey} />
            </Suspense>
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
        {paletteOpen && <CommandPalette key="palette" onClose={() => setPaletteOpen(false)} onQuickAdd={() => setQuickAddOpen(true)} />}
        {sessionExpired && <SessionExpiredDialog key="session" />}
      </AnimatePresence>
      {tour.open && <Tour onClose={closeTour} menuOpen={menuOpen} onStepChange={(step) => narrow && setMenuOpen(Boolean(step.inMenu))} />}
    </div>
  );
}
