import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBudgets } from '../../api/budgets.js';
import { formatVnd } from '../../utils/format.js';
import { formatMonth } from '../../utils/vnDate.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import Button from '../../components/Button/Button.jsx';
import Icon from '../../components/Icon.jsx';
import styles from './BudgetAlerts.module.css';

// "Budget alerts" card: the budgets of the month that reached 80% (warning) or 100% (over), the fullest first.
// It loads its own data, so a failed request never breaks the rest of the dashboard: the card shows a short
// message instead. The card has five states: loading, error, no budgets yet, all on track, or the alerts.
export default function BudgetAlerts({ month }) {
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
    if (failed) return <p className={styles.note}>Budgets could not be loaded.</p>;
    if (budgets === null) return <p className={styles.note}>Loading budgets…</p>;

    if (budgets.length === 0) {
      return (
        <div className={styles.invite}>
          <p className={styles.note}>
            No budgets in {formatMonth(month)} yet. Set a monthly limit for a category and you will get a warning at 80% and 100%.
          </p>
          <Button icon="plus" onClick={() => navigate('/budgets')}>
            Create a budget
          </Button>
        </div>
      );
    }

    if (alerts.length === 0) {
      return (
        <p className={styles.onTrack}>
          <Icon name="check" size={18} />
          <span>All budgets on track</span>
        </p>
      );
    }

    return (
      <ul className={styles.list}>
        {alerts.map((budget) => (
          <li key={budget._id} className={`${styles.item} ${styles[budget.status]}`}>
            <span className={styles.name}>
              <i className={styles.dot} style={{ background: budget.category.color }} aria-hidden="true" />
              <span>{budget.category.name}</span>
            </span>
            <span className={styles.message}>
              {budget.remaining < 0
                ? `Over by ${formatVnd(-budget.remaining)}`
                : budget.status === 'over'
                  ? 'Limit reached'
                  : `${formatVnd(budget.remaining)} left`}
            </span>
            <span className={styles.percent}>{budget.percent}%</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader icon="alert" tone="coral" title="Budget alerts" subtitle={formatMonth(month)}>
        <Button variant="secondary" onClick={() => navigate('/budgets')}>
          Manage budgets
        </Button>
      </CardHeader>
      {renderBody()}
    </Card>
  );
}
