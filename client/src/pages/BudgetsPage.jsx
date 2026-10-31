import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { getCategories } from '../api/categories.js';
import { getBudgets, copyBudgets, deleteBudget } from '../api/budgets.js';
import { getErrorMessage } from '../api/axios.js';
import { useToast } from '../context/ToastContext.jsx';
import { currentMonth, formatMonth, shiftMonth } from '../utils/vnDate.js';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import MonthPicker from '../components/MonthPicker/MonthPicker.jsx';
import Button from '../components/Button/Button.jsx';
import EmptyState from '../components/EmptyState/EmptyState.jsx';
import LoadingState from '../components/LoadingState/LoadingState.jsx';
import ErrorState from '../components/ErrorState/ErrorState.jsx';
import Reveal from '../components/Motion/Reveal.jsx';
import BudgetCard from './budgets/BudgetCard.jsx';
import BudgetFormDialog from './budgets/BudgetFormDialog.jsx';
import styles from './BudgetsPage.module.css';

// Header with the month picker, then a grid of budget cards.

// Same order as the API: by category name, ignoring upper / lower case.
function sortByCategory(list) {
  return [...list].sort((a, b) => a.category.name.localeCompare(b.category.name, 'en'));
}

export default function BudgetsPage() {
  const { t } = useTranslation();
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
  const [copying, setCopying] = useState(false);
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
    toast.success(dialog.budget ? t('budgets.updated') : t('budgets.added'));
    setDialog(null);
    setBudgets((list) => sortByCategory([...list.filter((b) => b._id !== saved._id), saved]));
  }

  // Copies last month's budgets into the month on screen, then loads the list again.
  async function handleCopy() {
    setCopying(true);
    try {
      const { copied } = await copyBudgets(shiftMonth(month, -1), month);
      if (copied === 0) {
        toast.error(t('budgets.nothingToCopy', { month: formatMonth(shiftMonth(month, -1)) }));
        return;
      }
      toast.success(t('budgets.copied', { count: copied }));
      setLoading(true);
      setReloadKey((key) => key + 1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCopying(false);
    }
  }

  // Called by the card after its own "Are you sure?" step. Errors are shown here as a toast.
  async function handleDelete(budget) {
    try {
      await deleteBudget(budget._id);
      toast.success(t('budgets.deleted'));
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
    if (loading) return <LoadingState skeleton="cards">{t('budgets.loading')}</LoadingState>;
    if (loadError) return <ErrorState message={loadError} onRetry={retry} />;

    if (budgets.length === 0) {
      return (
        <EmptyState
          icon="wallet"
          title={t('budgets.noneInMonth', { month: formatMonth(month) })}
          text={t('budgets.emptyText')}
        >
          <div className={styles.emptyActions}>
            <Button icon="plus" onClick={() => setDialog({ budget: null })} disabled={copying}>
              {t('budgets.add')}
            </Button>
            <Button variant="secondary" onClick={handleCopy} disabled={copying}>
              {copying ? t('budgets.copying') : t('budgets.copyFromLast')}
            </Button>
          </div>
        </EmptyState>
      );
    }

    return (
      <ul className={styles.grid}>
        {budgets.map((budget, index) => (
          <Reveal as="li" key={budget._id} index={index}>
            <BudgetCard budget={budget} onEdit={(b) => setDialog({ budget: b })} onDelete={handleDelete} />
          </Reveal>
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('nav.budgets')}
        subtitle={ready ? `${formatMonth(month)} · ${t('budgets.count', { count: budgets.length })}` : formatMonth(month)}
      >
        <MonthPicker month={month} onChange={changeMonth} />
        <Button icon="plus" onClick={() => setDialog({ budget: null })} disabled={!ready}>
          {t('budgets.add')}
        </Button>
      </PageHeader>

      {renderContent()}

      <AnimatePresence>
        {dialog && (
          <BudgetFormDialog
            key="budget-form"
            budget={dialog.budget}
            month={month}
            availableCategories={availableCategories}
            onSaved={handleSaved}
            onClose={() => setDialog(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
