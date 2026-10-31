import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBudgets } from '../../api/budgets.js';
import { formatPercent, formatVnd } from '../../utils/format.js';
import { formatMonth } from '../../utils/vnDate.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import Button from '../../components/Button/Button.jsx';
import LoadingState from '../../components/LoadingState/LoadingState.jsx';
import Icon from '../../components/Icon.jsx';
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
import styles from './BudgetAlerts.module.css';

// "Budget alerts" card: the budgets of the month that reached 80% (warning) or 100% (over), the fullest first.
// It loads its own data, so a failed request never breaks the rest of the dashboard: the card shows a short
// message instead. The card has five states: loading, error, no budgets yet, all on track, or the alerts.
export default function BudgetAlerts({ month }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // null while loading, then the list of budgets of the month
  const [budgets, setBudgets] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false; // ignore an outdated answer after the month changed
    setBudgets(null);
    setFailed(false);
    getBudgets(month)
      .then((data) => {
        if (!cancelled) setBudgets(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const alerts = (budgets ?? []).filter((b) => b.status !== 'ok').sort((a, b) => b.percent - a.percent);

  function renderBody() {
    if (failed) return <p className={styles.note}>{t('dashboard.budgetsFailed')}</p>;
    if (budgets === null) return <LoadingState skeleton="rows" count={2}>{t('budgets.loading')}</LoadingState>;

    if (budgets.length === 0) {
      return (
        <div className={styles.invite}>
          <p className={styles.note}>
            {t('dashboard.noBudgets', { month: formatMonth(month) })}
          </p>
          <Button icon="plus" onClick={() => navigate('/budgets')}>
            {t('dashboard.createBudget')}
          </Button>
        </div>
      );
    }

    if (alerts.length === 0) {
      return (
        <p className={styles.onTrack}>
          <Icon name="check" size={18} />
          <span>{t('dashboard.budgetsOnTrack')}</span>
        </p>
      );
    }

    return (
      <ul className={styles.list}>
        {alerts.map((budget) => (
          <li key={budget._id} className={`${styles.item} ${styles[budget.status]}`}>
            <span className={styles.name}>
              <CategoryMark category={budget.category} />
              <span>{budget.category.name}</span>
            </span>
            <span className={styles.message}>
              {budget.remaining < 0
                ? t('budgets.overBy', { amount: formatVnd(-budget.remaining) })
                : budget.status === 'over'
                  ? t('budgets.limitReached')
                  : t('budgets.left', { amount: formatVnd(budget.remaining) })}
            </span>
            <span className={styles.percent}>{formatPercent(budget.percent)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader icon="alert" tone="coral" title={t('dashboard.budgetAlerts')} subtitle={formatMonth(month)}>
        <Button variant="secondary" onClick={() => navigate('/budgets')}>
          {t('dashboard.manageBudgets')}
        </Button>
      </CardHeader>
      {renderBody()}
    </Card>
  );
}
