import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGoals } from '../../api/goals.js';
import { formatDate, formatVnd } from '../../utils/format.js';
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
  const navigate = useNavigate();
  // null while loading, then the list of goals
  const [goals, setGoals] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false; // StrictMode runs effects twice in dev; ignore the first run's answer
    getGoals()
      .then((data) => {
        if (!cancelled) setGoals(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openGoals = (goals ?? []).filter((g) => !g.completed).slice(0, MAX_GOALS);

  function renderBody() {
    if (failed) return <p className={styles.note}>Goals could not be loaded.</p>;
    if (goals === null) return <LoadingState skeleton="rows" count={2}>Loading goals…</LoadingState>;

    if (goals.length === 0) {
      return (
        <div className={styles.invite}>
          <p className={styles.note}>Save up for something you want. Set a target, add money and follow the progress here.</p>
          <Button icon="plus" onClick={() => navigate('/goals')}>
            Create a goal
          </Button>
        </div>
      );
    }

    if (openGoals.length === 0) {
      return (
        <p className={styles.allDone}>
          <Icon name="check" size={18} />
          <span>All goals completed</span>
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
              <span className={styles.percent}>{goal.progress}%</span>
            </div>
            <div
              className={styles.track}
              role="progressbar"
              aria-label={goal.name}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={goal.progress}
              aria-valuetext={`${goal.progress}% saved`}
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
                  : 'No deadline'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader icon="target" tone="mint" title="Savings goals" subtitle="Due first">
        <Button variant="secondary" onClick={() => navigate('/goals')}>
          View all
        </Button>
      </CardHeader>
      {renderBody()}
    </Card>
  );
}
