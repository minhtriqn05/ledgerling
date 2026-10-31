import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { deleteNotification, getNotifications, markAllRead, markRead } from '../api/notifications.js';
import { getErrorMessage } from '../api/axios.js';
import { useNotifications } from '../context/NotificationsContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import Card from '../components/Card/Card.jsx';
import Button from '../components/Button/Button.jsx';
import SegmentedControl from '../components/SegmentedControl/SegmentedControl.jsx';
import EmptyState from '../components/EmptyState/EmptyState.jsx';
import LoadingState from '../components/LoadingState/LoadingState.jsx';
import ErrorState from '../components/ErrorState/ErrorState.jsx';
import NotificationItem from '../components/Notifications/NotificationItem.jsx';
import Pager from './transactions/Pager.jsx';
import styles from './NotificationsPage.module.css';

const PAGE_SIZE = 10;

// All notifications, 10 per page, with a filter for the unread ones. The switches for each kind of notification are
// in Settings (the button in the header opens them).
export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { unread, setUnread, refreshUnread } = useNotifications();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Loads the page on screen. `silent` keeps the list in place (no loading text) for a refresh after a change.
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setLoadError('');
      }
      try {
        const result = await getNotifications({ page, limit: PAGE_SIZE, unread: filter === 'unread' });
        setItems(result.items);
        setMeta(result.meta);
        setLoadError('');
        // Listing may have made the weekly summary, so the number on the bell can have changed
        refreshUnread();
      } catch (err) {
        if (!silent) setLoadError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [page, filter, refreshUnread]
  );

  useEffect(() => {
    load();
  }, [load]);

  function changeFilter(value) {
    setFilter(value);
    setPage(1);
  }

  function handleOpen(notification) {
    if (!notification.read) {
      setItems((list) => list.map((n) => (n._id === notification._id ? { ...n, read: true } : n)));
      setUnread((count) => Math.max(0, count - 1));
      markRead(notification._id).catch(() => refreshUnread());
    }
    if (notification.link) navigate(notification.link);
  }

  async function handleMarkAll() {
    try {
      await markAllRead();
      setUnread(0);
      toast.success(t('notifications.allRead'));
      load({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete(notification) {
    try {
      await deleteNotification(notification._id);
    } catch (err) {
      toast.error(getErrorMessage(err));
      return;
    }
    toast.success(t('notifications.deleted'));
    if (!notification.read) setUnread((count) => Math.max(0, count - 1));
    // The last row of a page: go back one page, which loads it
    if (items.length === 1 && page > 1) setPage(page - 1);
    else load({ silent: true });
  }

  function renderContent() {
    if (loading) return <LoadingState skeleton="rows">{t('notifications.loading')}</LoadingState>;
    if (loadError) return <ErrorState message={loadError} onRetry={() => load()} />;

    if (items.length === 0) {
      const onlyUnread = filter === 'unread';
      return (
        <EmptyState
          icon="bell"
          title={t(onlyUnread ? 'notifications.emptyUnreadTitle' : 'notifications.emptyTitle')}
          text={t(onlyUnread ? 'notifications.emptyUnreadText' : 'notifications.emptyText')}
        />
      );
    }

    return (
      <>
        <Card className={styles.listCard}>
          <ul className={styles.list}>
            {items.map((notification) => (
              <NotificationItem key={notification._id} notification={notification} onOpen={handleOpen} onDelete={handleDelete} />
            ))}
          </ul>
        </Card>
        <Pager meta={meta} onPage={setPage} countKey="notifications.count" />
      </>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('nav.notifications')}
        subtitle={!loading && !loadError ? t('notifications.unreadCount', { count: unread }) : undefined}
      >
        <Button variant="secondary" icon="settings" onClick={() => navigate('/settings#notifications')}>
          {t('notifications.settingsLink')}
        </Button>
        <Button variant="secondary" icon="check" onClick={handleMarkAll} disabled={unread === 0}>
          {t('notifications.markAllRead')}
        </Button>
      </PageHeader>

      <div className={styles.section}>
        <SegmentedControl
          label={t('notifications.filterLabel')}
          value={filter}
          onChange={changeFilter}
          options={[
            { value: 'all', label: t('notifications.filterAll') },
            { value: 'unread', label: t('notifications.filterUnread') },
          ]}
        />
        {renderContent()}
      </div>
    </div>
  );
}
