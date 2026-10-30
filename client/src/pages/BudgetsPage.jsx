import { useEffect, useState } from 'react';
import { getCategories } from '../api/categories.js';
import { getBudgets, deleteBudget } from '../api/budgets.js';
import { getErrorMessage } from '../api/axios.js';
import { useToast } from '../context/ToastContext.jsx';
import { currentMonth, formatMonth } from '../utils/vnDate.js';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import MonthPicker from '../components/MonthPicker/MonthPicker.jsx';
import Button from '../components/Button/Button.jsx';
import EmptyState from '../components/EmptyState/EmptyState.jsx';
import LoadingState from '../components/LoadingState/LoadingState.jsx';
import ErrorState from '../components/ErrorState/ErrorState.jsx';
import BudgetCard from './budgets/BudgetCard.jsx';
import BudgetFormDialog from './budgets/BudgetFormDialog.jsx';
import styles from './BudgetsPage.module.css';

// Header with the month picker, then a grid of budget cards.

// Same order as the API: by category name, ignoring upper / lower case.
function sortByCategory(list) {
  return [...list].sort((a, b) => a.category.name.localeCompare(b.category.name, 'en'));
}

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // "Try again" changes these, which runs the matching effect again
  const [categoriesKey, setCategoriesKey] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  // The open dialog: null or { budget } (budget = null for a new one)
  const [dialog, setDialog] = useState(null);
  const toast = useToast();

  // The categories fill the "Add budget" dialog. They load once.
  useEffect(() => {
    let cancelled = false; // StrictMode runs effects twice in dev; ignore the first run's answer
    getCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(getErrorMessage(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [categoriesKey]);

  // The budgets reload whenever the month changes.
  useEffect(() => {
    let cancelled = false;
    getBudgets(month)
      .then((data) => {
        if (!cancelled) setBudgets(data);
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
  }, [month, reloadKey]);

  function changeMonth(nextMonth) {
    setLoading(true);
    setLoadError('');
    setMonth(nextMonth);
  }

  function retry() {
    setLoading(true);
    setLoadError('');
    setCategoriesKey((key) => key + 1);
    setReloadKey((key) => key + 1);
  }

  // The form calls this with the budget the API returned (new or updated).
  function handleSaved(saved) {
    toast.success(dialog.budget ? 'Budget updated' : 'Budget added');
    setDialog(null);
    setBudgets((list) => sortByCategory([...list.filter((b) => b._id !== saved._id), saved]));
  }

  // Called by the card after its own "Are you sure?" step. Errors are shown here as a toast.
  async function handleDelete(budget) {
    try {
      await deleteBudget(budget._id);
      toast.success('Budget deleted');
      setBudgets((list) => list.filter((b) => b._id !== budget._id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const ready = !loading && !loadError;
  // Only expense categories without a budget in this month can get a new one.
  const budgeted = new Set(budgets.map((b) => b.category._id));
  const availableCategories = categories.filter((c) => c.type === 'expense' && !budgeted.has(c._id));

  // The page shows one of four states: loading, error, empty or the grid.
  function renderContent() {
    if (loading) return <LoadingState>Loading budgets…</LoadingState>;
    if (loadError) return <ErrorState message={loadError} onRetry={retry} />;

    if (budgets.length === 0) {
      return (
        <EmptyState
          icon="wallet"
          title={`No budgets in ${formatMonth(month)}`}
          text="Set a monthly limit for an expense category to keep your spending in check."
        >
          <Button icon="plus" onClick={() => setDialog({ budget: null })}>
            Add budget
          </Button>
        </EmptyState>
      );
    }

    return (
      <ul className={styles.grid}>
        {budgets.map((budget) => (
          <li key={budget._id}>
            <BudgetCard budget={budget} onEdit={(b) => setDialog({ budget: b })} onDelete={handleDelete} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Budgets"
        subtitle={ready ? `${formatMonth(month)} · ${budgets.length} ${budgets.length === 1 ? 'budget' : 'budgets'}` : formatMonth(month)}
      >
        <MonthPicker month={month} onChange={changeMonth} />
        <Button icon="plus" onClick={() => setDialog({ budget: null })} disabled={!ready}>
          Add budget
        </Button>
      </PageHeader>

      {renderContent()}

      {dialog && (
        <BudgetFormDialog
          budget={dialog.budget}
          month={month}
          availableCategories={availableCategories}
          onSaved={handleSaved}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
