import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBudgets } from '../../api/budgets.js';
import { formatVnd } from '../../utils/format.js';
import { formatMonth } from '../../utils/vnDate.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import styles from './BudgetAlerts.module.css';

// "Budget alerts" card: the budgets of the month that reached 80% (warning) or 100% (over), the fullest first.
// It loads its own data, so a failed request never breaks the rest of the dashboard: the card simply stays hidden.
// It is also hidden while loading and when no budget needs attention.
export default function BudgetAlerts({ month }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let cancelled = false; // ignore an outdated answer after the month changed
    getBudgets(month)
      .then((budgets) => {
        if (cancelled) return;
        setAlerts(budgets.filter((b) => b.status !== 'ok').sort((a, b) => b.percent - a.percent));
      })
      .catch(() => {
        if (!cancelled) setAlerts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  if (alerts.length === 0) return null;

  return (
    <Card>
      <CardHeader icon="alert" tone="coral" title="Budget alerts" subtitle={formatMonth(month)}>
        <Link className={styles.link} to="/budgets">
          View budgets
        </Link>
      </CardHeader>
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
    </Card>
  );
}
