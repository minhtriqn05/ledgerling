import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTransactions } from '../../api/transactions.js';
import { useLoad } from '../../hooks/useLoad.js';
import { useLiveRefresh } from '../../hooks/useLiveRefresh.js';
import { formatDayMonth, formatSignedVnd } from '../../utils/format.js';
import { formatMonth } from '../../utils/vnDate.js';
import Button from '../../components/Button/Button.jsx';
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
import CollapsibleCard from '../../components/CollapsibleCard/CollapsibleCard.jsx';
import LoadingState from '../../components/LoadingState/LoadingState.jsx';
import styles from './RecentTransactions.module.css';

const HOW_MANY = 5;

// "Recent transactions" card: the newest transactions of the month, as rows like on a bank statement.
// It loads its own data like the other dashboard cards, so a failed request only affects this card.
export default function RecentTransactions({ month }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error, reload, refresh } = useLoad(() => getTransactions({ month, limit: HOW_MANY, sort: '-date' }), [month]);
  useLiveRefresh(['transactions', 'categories'], refresh);

  function renderBody() {
    if (loading) return <LoadingState skeleton="rows" count={3}>{t('transactions.loading')}</LoadingState>;
    if (error) {
      return (
        <div className={styles.invite}>
          <p className={styles.note}>{t('dashboard.recentFailed')}</p>
          <Button variant="secondary" size="sm" onClick={reload}>
            {t('common.tryAgain')}
          </Button>
        </div>
      );
    }
    if (data.items.length === 0) {
      return <p className={styles.note}>{t('transactions.noneInMonth', { month: formatMonth(month) })}</p>;
    }

    return (
      <ul className={styles.list}>
        {data.items.map((transaction) => (
          <li key={transaction._id} className={styles.row}>
            <CategoryMark category={transaction.category} size="lg" />
            <span className={styles.text}>
              <strong>{transaction.note || transaction.category.name}</strong>
              <span>
                {transaction.category.name} · {formatDayMonth(transaction.date)}
              </span>
            </span>
            <strong className={`${styles.amount} ${styles[transaction.type]}`}>{formatSignedVnd(transaction.amount, transaction.type)}</strong>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <CollapsibleCard
      id="dashboard.recent"
      icon="transactions"
      tone="teal"
      title={t('dashboard.recent')}
      subtitle={formatMonth(month)}
      actions={
        <Button variant="secondary" size="sm" onClick={() => navigate('/transactions')}>
          {t('common.viewAll')}
        </Button>
      }
    >
      {renderBody()}
    </CollapsibleCard>
  );
}
