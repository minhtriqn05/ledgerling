import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPercent, formatVnd } from '../../utils/format.js';
import Card from '../../components/Card/Card.jsx';
import Button from '../../components/Button/Button.jsx';
import IconButton from '../../components/IconButton/IconButton.jsx';
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
import styles from './BudgetCard.module.css';

// One budget in the grid: category dot + name, "spent / amount", a progress bar and a "left / over" line.
// The bar and the last line take their color from budget.status: ok (green), warning (yellow, 80% and up), over (red, 100% and up).
// Delete is confirmed inside the card, like on the Categories page.
export default function BudgetCard({ budget, onEdit, onDelete }) {
  const { t } = useTranslation();
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
          {t('budgets.deleteQuestion', { name: category.name })}
        </h2>
        <p className={styles.confirmText}>{t('budgets.deleteText')}</p>
        <div className={styles.confirmActions}>
          {/* autoFocus: keyboard users land on the safe choice */}
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={deleting} autoFocus>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </Card>
    );
  }

  const over = budget.remaining < 0;

  return (
    <Card className={`${styles.card} ${styles[budget.status]}`} lift>
      <div className={styles.top}>
        <h2 id={titleId} className={styles.name}>
          <CategoryMark category={category} size="md" />
          <span>{category.name}</span>
        </h2>
        <span className={styles.actions}>
          <IconButton icon="edit" size={16} label={t('budgets.editName', { name: category.name })} onClick={() => onEdit(budget)} />
          <IconButton
            icon="trash"
            size={16}
            label={t('budgets.deleteName', { name: category.name })}
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
        aria-valuetext={t('budgets.percentUsed', { percent: budget.percent })}
      >
        <span className={styles.bar} style={{ width: `${Math.min(budget.percent, 100)}%` }} />
      </div>

      <div className={styles.footer}>
        <span className={styles.status}>{over ? t('budgets.overBy', { amount: formatVnd(-budget.remaining) }) : t('budgets.left', { amount: formatVnd(budget.remaining) })}</span>
        <span className={styles.percent}>{formatPercent(budget.percent)}</span>
      </div>
    </Card>
  );
}
