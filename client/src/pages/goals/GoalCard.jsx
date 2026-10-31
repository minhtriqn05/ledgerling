import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatPercent, formatVnd } from '../../utils/format.js';
import { daysUntil, formatDaysLeft, monthlySaving } from '../../utils/goals.js';
import Card from '../../components/Card/Card.jsx';
import Button from '../../components/Button/Button.jsx';
import IconButton from '../../components/IconButton/IconButton.jsx';
import Icon from '../../components/Icon.jsx';
import styles from './GoalCard.module.css';

// One savings goal in the grid: color dot + name, "saved / target", a progress bar, the deadline with the days left,
// "Save X per month to reach it", and the Add money / Withdraw buttons.
// A completed goal gets a "Completed" label and a green bar. The history, edit and delete buttons are in the top corner.
// `today` ("YYYY-MM-DD") is only given by tests.
export default function GoalCard({ goal, today, onAddMoney, onWithdraw, onHistory, onEdit, onDelete }) {
  const { t } = useTranslation();
  const titleId = useId();
  const daysLeft = goal.deadline ? daysUntil(goal.deadline, today) : null;
  const perMonth = monthlySaving(goal, today);
  const late = !goal.completed && daysLeft !== null && daysLeft < 0;

  return (
    <Card className={`${styles.card} ${goal.completed ? styles.completed : ''}`} lift style={{ '--goal-color': goal.color }}>
      <div className={styles.top}>
        <h2 id={titleId} className={styles.name}>
          <i className={styles.dot} aria-hidden="true" />
          <span>{goal.name}</span>
        </h2>
        <span className={styles.actions}>
          <IconButton icon="history" size={16} label={t('goals.historyOf', { name: goal.name })} onClick={() => onHistory(goal)} />
          <IconButton needsNetwork icon="edit" size={16} label={t('common.editName', { name: goal.name })} onClick={() => onEdit(goal)} />
          <IconButton needsNetwork icon="trash" size={16} label={t('common.deleteName', { name: goal.name })} danger onClick={() => onDelete(goal)} />
        </span>
      </div>

      {goal.completed && (
        <p className={styles.badge}>
          <Icon name="check" size={14} />
          {t('goals.completed')}
        </p>
      )}

      <p className={styles.amounts}>
        <strong>{formatVnd(goal.savedAmount)}</strong>
        <span> / {formatVnd(goal.targetAmount)}</span>
      </p>

      <div
        className={styles.track}
        role="progressbar"
        aria-labelledby={titleId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={goal.progress}
        aria-valuetext={t('goals.percentSaved', { percent: goal.progress })}
      >
        <span className={styles.bar} style={{ width: `${goal.progress}%` }} />
      </div>

      <div className={styles.footer}>
        <span>{goal.completed ? t('goals.reached') : t('goals.toGo', { amount: formatVnd(goal.remaining) })}</span>
        <span className={styles.percent}>{formatPercent(goal.progress)}</span>
      </div>

      {goal.deadline && (
        <p className={`${styles.deadline} ${late ? styles.late : ''}`}>
          <span>{t('goals.due', { date: formatDate(goal.deadline) })}</span>
          {!goal.completed && <span>{formatDaysLeft(daysLeft)}</span>}
        </p>
      )}

      {perMonth !== null && <p className={styles.perMonth}>{t('goals.perMonth', { amount: formatVnd(perMonth) })}</p>}

      <div className={styles.buttons}>
        <Button needsNetwork icon="plus" onClick={() => onAddMoney(goal)}>
          {t('goals.addMoney')}
        </Button>
        {/* Nothing saved, nothing to take out */}
        <Button needsNetwork variant="secondary" onClick={() => onWithdraw(goal)} disabled={goal.savedAmount === 0}>
          {t('goals.withdraw')}
        </Button>
      </div>
    </Card>
  );
}
