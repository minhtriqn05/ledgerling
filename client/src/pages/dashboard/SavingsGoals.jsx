import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getGoals } from '../../api/goals.js';
import { useLoad } from '../../hooks/useLoad.js';
import { useLiveRefresh } from '../../hooks/useLiveRefresh.js';
import { formatDate, formatPercent, formatVnd } from '../../utils/format.js';
import { daysUntil, formatDaysLeft } from '../../utils/goals.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import Button from '../../components/Button/Button.jsx';
import LoadingState from '../../components/LoadingState/LoadingState.jsx';
import Icon from '../../components/Icon.jsx';
import styles from './SavingsGoals.module.css';

// How many goals the card shows
const MAX_GOALS = 2;

// "Savings goals" card: the 2 goals that are not completed yet and are due first.
// The API already sorts the goals that way (not completed first, nearest deadline first, goals without a deadline after them).
// Like the budget alerts, it loads its own data, so a failed request never breaks the rest of the dashboard.
// The card has five states: loading, error, no goals yet, all completed, or the goals.
export default function SavingsGoals() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // null while loading, then the list of goals
  const { data: goals, error, refresh } = useLoad(getGoals, []);
  const failed = Boolean(error);
  useLiveRefresh('goals', refresh);

  const openGoals = (goals ?? []).filter((g) => !g.completed).slice(0, MAX_GOALS);

  function renderBody() {
    if (failed) return <p className={styles.note}>{t('dashboard.goalsFailed')}</p>;
    if (goals === null) return <LoadingState skeleton="rows" count={2}>{t('goals.loading')}</LoadingState>;

    if (goals.length === 0) {
      return (
        <div className={styles.invite}>
          <p className={styles.note}>{t('dashboard.goalsInvite')}</p>
          <Button needsNetwork icon="plus" onClick={() => navigate('/goals')}>
            {t('dashboard.createGoal')}
          </Button>
        </div>
      );
    }

    if (openGoals.length === 0) {
      return (
        <p className={styles.allDone}>
          <Icon name="check" size={18} />
          <span>{t('dashboard.goalsDone')}</span>
        </p>
      );
    }

    return (
      <ul className={styles.list}>
        {openGoals.map((goal) => (
          <li key={goal._id} className={styles.item} style={{ '--goal-color': goal.color }}>
            <div className={styles.line}>
              <span className={styles.name}>
                <i className={styles.dot} aria-hidden="true" />
                <span>{goal.name}</span>
              </span>
              <span className={styles.percent}>{formatPercent(goal.progress)}</span>
            </div>
            <div
              className={styles.track}
              role="progressbar"
              aria-label={goal.name}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={goal.progress}
              aria-valuetext={t('goals.percentSaved', { percent: goal.progress })}
            >
              <span className={styles.bar} style={{ width: `${goal.progress}%` }} />
            </div>
            <div className={styles.line}>
              <span className={styles.meta}>
                {formatVnd(goal.savedAmount)} / {formatVnd(goal.targetAmount)}
              </span>
              <span className={styles.meta}>
                {goal.deadline
                  ? `${formatDate(goal.deadline)} · ${formatDaysLeft(daysUntil(goal.deadline))}`
                  : t('dashboard.noDeadline')}
              </span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader icon="target" tone="mint" title={t('dashboard.savingsGoals')} subtitle={t('dashboard.dueFirst')}>
        <Button variant="secondary" onClick={() => navigate('/goals')}>
          {t('common.viewAll')}
        </Button>
      </CardHeader>
      {renderBody()}
    </Card>
  );
}
