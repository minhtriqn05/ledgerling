import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { getAdminUsers } from '../../api/admin.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useLoad } from '../../hooks/useLoad.js';
import { canChangeStatus } from '../../utils/admin.js';
import { formatDateDMY, formatNumber } from '../../utils/format.js';
import Button from '../../components/Button/Button.jsx';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import LoadingState from '../../components/LoadingState/LoadingState.jsx';
import TextField from '../../components/TextField/TextField.jsx';
import Pager from '../transactions/Pager.jsx';
import UserStatusDialog from './UserStatusDialog.jsx';
import styles from './UsersTable.module.css';

// Wait this long after the last key before searching, so one request is sent per word and not per letter.
const SEARCH_DELAY_MS = 300;

// The accounts of the site: a search box, a table (cards on a phone), a pager, and Disable / Enable with a confirm dialog.
// Data comes from GET /api/admin/users. A normal user is never shown this component (AdminRoute), and the API refuses them anyway.
export default function UsersTable() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null); // the user whose Disable / Enable dialog is open
  const { data, loading, error, reload } = useLoad(() => getAdminUsers({ q, page }), [q, page]);

  // Copy the typed text into the search once the typing stopped; a new search starts on page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function handleChanged(user, status) {
    toast.success(t(status === 'disabled' ? 'admin.dialog.disabled' : 'admin.dialog.enabled', { name: user.name }));
    setTarget(null);
    reload();
  }

  function renderBody() {
    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (!data) return <LoadingState skeleton="rows" count={5}>{t('admin.users.loading')}</LoadingState>;
    if (data.users.length === 0) {
      return <EmptyState icon="user" title={t('admin.users.emptyTitle')} text={t('admin.users.emptyText', { q })} />;
    }

    return (
      <>
        {/* The old rows stay (a little faded) while a new page or search is on its way */}
        <div className={`${styles.tableWrap} ${loading ? styles.busy : ''}`} aria-busy={loading}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('admin.users.columns.name')}</th>
                <th scope="col">{t('admin.users.columns.email')}</th>
                <th scope="col">{t('admin.users.columns.role')}</th>
                <th scope="col">{t('admin.users.columns.status')}</th>
                <th scope="col">{t('admin.users.columns.joined')}</th>
                <th scope="col" className={styles.number}>
                  {t('admin.users.columns.transactions')}
                </th>
                <th scope="col">
                  <span className={styles.srOnly}>{t('admin.users.columns.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user._id}>
                  <td data-label={t('admin.users.columns.name')} className={styles.name}>
                    {user.name}
                    {user._id === me._id && <span className={styles.you}>{t('admin.users.you')}</span>}
                  </td>
                  <td data-label={t('admin.users.columns.email')} className={styles.email}>
                    {user.email}
                  </td>
                  <td data-label={t('admin.users.columns.role')}>
                    <span className={`${styles.badge} ${user.role === 'admin' ? styles.admin : styles.plain}`}>
                      {t(`admin.users.roles.${user.role}`)}
                    </span>
                  </td>
                  <td data-label={t('admin.users.columns.status')}>
                    <span className={`${styles.badge} ${user.status === 'disabled' ? styles.disabled : styles.active}`}>
                      {t(`admin.users.statuses.${user.status}`)}
                    </span>
                  </td>
                  <td data-label={t('admin.users.columns.joined')}>{formatDateDMY(user.createdAt)}</td>
                  <td data-label={t('admin.users.columns.transactions')} className={styles.number}>
                    {formatNumber(user.transactionCount)}
                  </td>
                  <td className={styles.action}>
                    {canChangeStatus(user, me._id) ? (
                      <Button
                        variant="secondary"
                        className={styles.rowButton}
                        aria-label={t(user.status === 'disabled' ? 'admin.users.enableFor' : 'admin.users.disableFor', { name: user.name })}
                        onClick={() => setTarget(user)}
                      >
                        {t(user.status === 'disabled' ? 'admin.users.enable' : 'admin.users.disable')}
                      </Button>
                    ) : (
                      <span className={styles.none} title={t('admin.users.noAction')}>
                        <span aria-hidden="true">—</span>
                        <span className={styles.srOnly}>{t('admin.users.noAction')}</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager meta={data.meta} onPage={setPage} countKey="admin.users.count" />
      </>
    );
  }

  return (
    <Card>
      <CardHeader icon="user" tone="periwinkle" title={t('admin.users.title')} />
      <div className={styles.search}>
        <TextField
          label={t('admin.users.search')}
          icon="search"
          type="search"
          autoComplete="off"
          maxLength={100}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>
      {renderBody()}

      <AnimatePresence>
        {target && <UserStatusDialog key="status" user={target} onChanged={handleChanged} onClose={() => setTarget(null)} />}
      </AnimatePresence>
    </Card>
  );
}
