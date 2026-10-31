import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getNotifications, markAllRead, markRead } from '../../api/notifications.js';
import { getErrorMessage } from '../../api/axios.js';
import { useNotifications } from '../../context/NotificationsContext.jsx';
import { useOfflineLock } from '../../hooks/useOnline.js';
import Icon from '../Icon.jsx';
import Popover from '../Popover/Popover.jsx';
import NotificationItem from './NotificationItem.jsx';
import styles from './NotificationBell.module.css';

const DROPDOWN_SIZE = 8; // the dropdown shows the newest ones; the page shows all of them
const BADGE_MAX = 99;

// The bell in the navigation: a badge with the unread number, and a dropdown with the newest notifications.
// Opening the dropdown loads them (which also makes the weekly summary when it is due); clicking one marks it
// as read and goes to its link.
export default function NotificationBell() {
  const { t } = useTranslation();
  const { locked, note } = useOfflineLock();
  const navigate = useNavigate();
  const { unread, setUnread, refreshUnread } = useNotifications();
  const [open, setOpen] = useState(false);
  // items is null until the first answer
  const [state, setState] = useState({ items: null, error: '' });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false; // StrictMode runs effects twice in dev; ignore the first run's answer
    getNotifications({ limit: DROPDOWN_SIZE })
      .then(({ items }) => {
        if (cancelled) return;
        setState({ items, error: '' });
        // Listing may have created the weekly summary, so the number on the bell can have changed
        refreshUnread();
      })
      .catch((err) => {
        if (!cancelled) setState({ items: null, error: getErrorMessage(err) });
      });

    function handleKeyDown(event) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelled = true;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, refreshUnread]);

  function handleOpen(notification) {
    setOpen(false);
    if (!notification.read) {
      setUnread((count) => Math.max(0, count - 1));
      // If it fails the badge is wrong until the next poll corrects it
      markRead(notification._id).catch(() => refreshUnread());
    }
    if (notification.link) navigate(notification.link);
  }

  async function handleMarkAll() {
    try {
      await markAllRead();
      setState((current) => ({ ...current, items: current.items?.map((n) => ({ ...n, read: true })) ?? null }));
      setUnread(0);
    } catch (err) {
      setState((current) => ({ ...current, error: getErrorMessage(err) }));
    }
  }

  function goToPage() {
    setOpen(false);
    navigate('/notifications');
  }

  const label = unread > 0 ? t('notifications.bellUnread', { count: unread }) : t('notifications.title');

  function renderBody() {
    if (state.error) return <p className={styles.message} role="alert">{state.error}</p>;
    if (state.items === null) return <p className={styles.message}>{t('notifications.loading')}</p>;
    if (state.items.length === 0) {
      return (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Icon name="bell" size={22} />
          </span>
          <p className={styles.emptyTitle}>{t('notifications.emptyTitle')}</p>
          <p className={styles.emptyText}>{t('notifications.emptyText')}</p>
        </div>
      );
    }
    return (
      <ul className={styles.list}>
        {state.items.map((notification) => (
          <NotificationItem key={notification._id} notification={notification} onOpen={handleOpen} />
        ))}
      </ul>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.bell} ${open ? styles.bellOpen : ''}`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unread > BADGE_MAX ? `${BADGE_MAX}+` : unread}
          </span>
        )}
      </button>

      <Popover open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} className={styles.panel} role="dialog" aria-label={t('notifications.title')}>
        <div className={styles.header}>
          <h2 className={styles.heading}>{t('notifications.title')}</h2>
          <button type="button" className={styles.markAll} disabled={unread === 0 || locked} title={note} onClick={handleMarkAll}>
            {t('notifications.markAllRead')}
          </button>
        </div>
        <div className={styles.body}>{renderBody()}</div>
        <button type="button" className={styles.viewAll} onClick={goToPage}>
          {t('notifications.viewAll')}
        </button>
      </Popover>
    </>
  );
}
