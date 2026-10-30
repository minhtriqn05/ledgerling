import { useEffect, useState } from 'react';
import { getGoals } from '../api/goals.js';
import { getErrorMessage } from '../api/axios.js';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import Button from '../components/Button/Button.jsx';
import EmptyState from '../components/EmptyState/EmptyState.jsx';
import LoadingState from '../components/LoadingState/LoadingState.jsx';
import ErrorState from '../components/ErrorState/ErrorState.jsx';
import GoalCard from './goals/GoalCard.jsx';
import GoalFormDialog from './goals/GoalFormDialog.jsx';
import MoneyDialog from './goals/MoneyDialog.jsx';
import HistoryDialog from './goals/HistoryDialog.jsx';
import DeleteGoalDialog from './goals/DeleteGoalDialog.jsx';
import styles from './GoalsPage.module.css';

// A grid of savings goal cards. The API sorts them: goals still to reach first (nearest deadline first), completed last.
export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // "Try again" changes this, which runs the effect again
  const [reloadKey, setReloadKey] = useState(0);
  // The open dialog: null, { form: goal } (goal = null for a new one), { money: goal, mode: 'add' | 'withdraw' },
  // { history: goal } or { delete: goal }
  const [dialog, setDialog] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false; // StrictMode runs effects twice in dev; ignore the first run's answer
    getGoals()
      .then((data) => {
        if (!cancelled) setGoals(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setLoading(true);
    setLoadError('');
    setReloadKey((key) => key + 1);
  }

  // Shows the goal the API returned right away (a new goal at the top, a known goal in place), then asks for the
  // list again in the background: a new deadline or saving money can complete a goal, which changes its place in the order.
  // A failed background request is ignored; the card is already up to date.
  function showSaved(saved) {
    setGoals((list) => (list.some((g) => g._id === saved._id) ? list.map((g) => (g._id === saved._id ? saved : g)) : [saved, ...list]));
    getGoals()
      .then(setGoals)
      .catch(() => {});
  }

  function handleFormSaved(saved) {
    toast.success(dialog.form ? 'Goal updated' : 'Goal added');
    setDialog(null);
    showSaved(saved);
  }

  function handleMoneySaved(saved) {
    toast.success(dialog.mode === 'withdraw' ? 'Money withdrawn' : 'Money added');
    setDialog(null);
    showSaved(saved);
  }

  function handleDeleted(goal) {
    toast.success('Goal deleted');
    setDialog(null);
    setGoals((list) => list.filter((g) => g._id !== goal._id));
  }

  const ready = !loading && !loadError;
  const completedCount = goals.filter((g) => g.completed).length;

  // The page shows one of four states: loading, error, empty or the grid.
  function renderContent() {
    if (loading) return <LoadingState skeleton="cards">Loading goals…</LoadingState>;
    if (loadError) return <ErrorState message={loadError} onRetry={retry} />;

    if (goals.length === 0) {
      return (
        <EmptyState
          icon="target"
          title="No savings goals yet"
          text="Set a target for something you are saving for, then add money to it and watch the progress grow."
        >
          <Button icon="plus" onClick={() => setDialog({ form: null })}>
            New goal
          </Button>
        </EmptyState>
      );
    }

    return (
      <ul className={styles.grid}>
        {goals.map((goal) => (
          <li key={goal._id}>
            <GoalCard
              goal={goal}
              onAddMoney={(g) => setDialog({ money: g, mode: 'add' })}
              onWithdraw={(g) => setDialog({ money: g, mode: 'withdraw' })}
              onHistory={(g) => setDialog({ history: g })}
              onEdit={(g) => setDialog({ form: g })}
              onDelete={(g) => setDialog({ delete: g })}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Goals"
        subtitle={
          ready
            ? `${goals.length} ${goals.length === 1 ? 'goal' : 'goals'} · ${completedCount} completed`
            : undefined
        }
      >
        <Button icon="plus" onClick={() => setDialog({ form: null })} disabled={!ready}>
          New goal
        </Button>
      </PageHeader>

      {renderContent()}

      {dialog && 'form' in dialog && (
        <GoalFormDialog goal={dialog.form} onSaved={handleFormSaved} onClose={() => setDialog(null)} />
      )}
      {dialog?.money && (
        <MoneyDialog goal={dialog.money} mode={dialog.mode} onSaved={handleMoneySaved} onClose={() => setDialog(null)} />
      )}
      {dialog?.history && (
        <HistoryDialog goal={dialog.history} onChanged={showSaved} onClose={() => setDialog(null)} />
      )}
      {dialog?.delete && (
        <DeleteGoalDialog goal={dialog.delete} onDeleted={handleDeleted} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
