import { useId, useState } from 'react';
import { formatVnd } from '../../utils/format.js';
import Card from '../../components/Card/Card.jsx';
import Button from '../../components/Button/Button.jsx';
import IconButton from '../../components/IconButton/IconButton.jsx';
import styles from './BudgetCard.module.css';

// One budget in the grid: category dot + name, "spent / amount", a progress bar and a "left / over" line.
// The bar and the last line take their color from budget.status: ok (green), warning (yellow, 80% and up), over (red, 100% and up).
// Delete is confirmed inside the card, like on the Categories page.
export default function BudgetCard({ budget, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const titleId = useId();
  const { category } = budget;

  async function handleDelete() {
    setDeleting(true);
    await onDelete(budget);
    // On success the page has already removed this card. If the delete failed (the page shows the error),
    // the card goes back to normal.
    setDeleting(false);
    setConfirming(false);
  }

  if (confirming) {
    return (
      <Card className={styles.card} role="group" aria-labelledby={titleId}>
        <h2 id={titleId} className={styles.name}>
          Delete the "{category.name}" budget?
        </h2>
        <p className={styles.confirmText}>Your transactions are not affected. This can't be undone.</p>
        <div className={styles.confirmActions}>
          {/* autoFocus: keyboard users land on the safe choice */}
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={deleting} autoFocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Card>
    );
  }

  const over = budget.remaining < 0;

  return (
    <Card className={`${styles.card} ${styles[budget.status]}`}>
      <div className={styles.top}>
        <h2 id={titleId} className={styles.name}>
          <i className={styles.dot} style={{ background: category.color }} aria-hidden="true" />
          <span>{category.name}</span>
        </h2>
        <span className={styles.actions}>
          <IconButton icon="edit" size={16} label={`Edit the ${category.name} budget`} onClick={() => onEdit(budget)} />
          <IconButton
            icon="trash"
            size={16}
            label={`Delete the ${category.name} budget`}
            danger
            onClick={() => setConfirming(true)}
          />
        </span>
      </div>

      <p className={styles.amounts}>
        <strong>{formatVnd(budget.spent)}</strong>
        <span> / {formatVnd(budget.amount)}</span>
      </p>

      <div
        className={styles.track}
        role="progressbar"
        aria-labelledby={titleId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(budget.percent, 100)}
        aria-valuetext={`${budget.percent}% used`}
      >
        <span className={styles.bar} style={{ width: `${Math.min(budget.percent, 100)}%` }} />
      </div>

      <div className={styles.footer}>
        <span className={styles.status}>{over ? `Over by ${formatVnd(-budget.remaining)}` : `${formatVnd(budget.remaining)} left`}</span>
        <span className={styles.percent}>{budget.percent}%</span>
      </div>
    </Card>
  );
}
