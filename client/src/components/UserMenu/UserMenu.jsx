import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeChoice } from '../../hooks/useThemeChoice.js';
import { settingsPath } from '../../config/settingsSections.js';
import Avatar from '../Avatar/Avatar.jsx';
import Icon from '../Icon.jsx';
import Popover from '../Popover/Popover.jsx';
import styles from './UserMenu.module.css';

const THEMES = [
  { value: 'light', icon: 'sun' },
  { value: 'dark', icon: 'moon' },
  { value: 'system', icon: 'monitor' },
];

// The card at the bottom of the sidebar: the avatar, the name and the email. A click opens the menu of the account:
// Profile, Settings, a quick switch of the theme, Keyboard shortcuts, the tour and Log out.
// The keyboard works as in any menu: the focus moves in, arrows go up and down, Escape closes and goes back to the card.
// onLeave: an item that opens a page was chosen (the phone menu closes then).
export default function UserMenu({ user, onShortcuts, onTour, onLogout, onLeave }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, choose } = useThemeChoice();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const items = () => [...(menuRef.current?.querySelectorAll('[role^="menuitem"]') ?? [])];

  useEffect(() => {
    if (open) items()[0]?.focus({ preventScroll: true });
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function run(action) {
    close();
    action();
  }

  function goTo(path) {
    run(() => {
      navigate(path);
      onLeave?.();
    });
  }

  function handleKeyDown(event) {
    const list = items();
    const index = list.indexOf(document.activeElement);
    const moves = {
      ArrowDown: (index + 1) % list.length,
      ArrowUp: (index - 1 + list.length) % list.length,
      Home: 0,
      End: list.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      list[moves[event.key]]?.focus();
    } else if (event.key === 'Escape') {
      // Only this menu: the phone menu around it stays open
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="account"
        data-tour="account"
        data-tooltip={user.name}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={user.name} avatar={user.avatar} />
        <span className={styles.text} data-account-text>
          <strong className={styles.name} data-testid="account-name">
            {user.name}
          </strong>
          {/* For the eye: the name of the button is the name of the person */}
          <span className={styles.email} aria-hidden="true">
            {user.email}
          </span>
        </span>
        <span className={styles.chevron} data-account-chevron>
          <Icon name="chevronDown" size={16} />
        </span>
      </button>

      <Popover anchorRef={triggerRef} open={open} onClose={() => setOpen(false)} className={styles.panel}>
        <div ref={menuRef} role="menu" aria-label={t('userMenu.label')} className={styles.menu} onKeyDown={handleKeyDown}>
          <MenuItem icon="user" onClick={() => goTo(settingsPath('profile'))}>
            {t('userMenu.profile')}
          </MenuItem>
          <MenuItem icon="settings" onClick={() => goTo('/settings')}>
            {t('nav.settings')}
          </MenuItem>

          <div className={styles.separator} role="separator" />

          <div className={styles.themeRow} role="group" aria-label={t('settings.appearance.theme')}>
            <span className={styles.themeLabel} aria-hidden="true">
              {t('settings.appearance.theme')}
            </span>
            <span className={styles.themes}>
              {THEMES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={theme === option.value}
                  aria-label={t(`settings.appearance.${option.value}`)}
                  title={t(`settings.appearance.${option.value}`)}
                  className={`${styles.themeButton} ${theme === option.value ? styles.themeChosen : ''}`}
                  onClick={() => choose(option.value)}
                >
                  <Icon name={option.icon} size={16} />
                </button>
              ))}
            </span>
          </div>

          <div className={styles.separator} role="separator" />

          <MenuItem icon="keyboard" onClick={() => run(onShortcuts)}>
            {t('shortcuts.title')}
          </MenuItem>
          <MenuItem icon="compass" onClick={() => run(onTour)}>
            {t('tour.open')}
          </MenuItem>

          <div className={styles.separator} role="separator" />

          <MenuItem icon="logout" onClick={() => run(onLogout)}>
            {t('nav.logout')}
          </MenuItem>
        </div>
      </Popover>
    </>
  );
}

function MenuItem({ icon, onClick, children }) {
  return (
    <button type="button" role="menuitem" className={styles.item} onClick={onClick}>
      <Icon name={icon} size={18} />
      <span>{children}</span>
    </button>
  );
}
