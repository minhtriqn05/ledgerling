import { useEffect, useState } from 'react';
import { getCategories } from '../api/categories.js';
import { getTransactions } from '../api/transactions.js';
import { getErrorMessage } from '../api/axios.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatSignedVnd, formatVnd } from '../utils/format.js';
import { currentMonth, formatMonth, toDateInput } from '../utils/vnDate.js';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import MonthPicker from '../components/MonthPicker/MonthPicker.jsx';
import Card from '../components/Card/Card.jsx';
import Button from '../components/Button/Button.jsx';
import Alert from '../components/Alert/Alert.jsx';
import EmptyState from '../components/EmptyState/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import TransactionList from './transactions/TransactionList.jsx';
import TransactionFormDialog from './transactions/TransactionFormDialog.jsx';
import DeleteTransactionDialog from './transactions/DeleteTransactionDialog.jsx';
import styles from './TransactionsPage.module.css';

// Design: TransactionsPreview in pages/styleGuide. Header with the month picker, three summary cards,
// then a card with the category filter and the list. Plan: docs/plans/transactions-page.md.

// One of the three tinted cards (income / expense / net). tone: 'income' | 'expense' | 'net'.
function SummaryCard({ tone, icon, label, value }) {
  return (
    <div className={`${styles.summaryCard} ${styles[tone]}`}>
      <span className={styles.summaryTile}>
        <Icon name={icon} size={18} />
      </span>
      <div className={styles.summaryText}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [categoryId, setCategoryId] = useState('all');
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // "Try again" and a save change these, which runs the matching effect again
  const [categoriesKey, setCategoriesKey] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  // The open dialog: null, { kind: 'form', transaction } (transaction = null for a new one) or { kind: 'delete', transaction }
  const [dialog, setDialog] = useState(null);
  const toast = useToast();

  // The categories fill the filter and the form. They load once.
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

  // The list reloads whenever the month or the category filter changes.
  useEffect(() => {
    let cancelled = false;
    const filters = { month };
    if (categoryId !== 'all') filters.categoryId = categoryId;

    getTransactions(filters)
      .then((data) => {
        if (!cancelled) setTransactions(data);
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
  }, [month, categoryId, reloadKey]);

  // Shows "Loading…" again and clears an old error; every change that reloads the list calls this first.
  function startLoading() {
    setLoading(true);
    setLoadError('');
  }

  function changeMonth(nextMonth) {
    startLoading();
    setMonth(nextMonth);
  }

  function changeCategory(event) {
    startLoading();
    setCategoryId(event.target.value);
  }

  function retry() {
    startLoading();
    setCategoriesKey((key) => key + 1);
    setReloadKey((key) => key + 1);
  }

  // The form calls this with the transaction the API returned (new or updated).
  function handleSaved(saved) {
    toast.success(dialog.transaction ? 'Transaction updated' : 'Transaction added');
    setDialog(null);
    startLoading();
    // Follow the transaction: if it is in another month, or in a category the filter hides, change the filter.
    const savedMonth = toDateInput(saved.date).slice(0, 7);
    if (savedMonth !== month) setMonth(savedMonth);
    if (categoryId !== 'all' && categoryId !== saved.category._id) setCategoryId('all');
    setReloadKey((key) => key + 1);
  }

  function handleDeleted(deleted) {
    toast.success('Transaction deleted');
    setDialog(null);
    setTransactions((list) => list.filter((t) => t._id !== deleted._id));
  }

  const ready = !loading && !loadError;
  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  // The card shows one of four states: loading, error, empty or the list.
  function renderContent() {
    if (loading) {
      return (
        <p className={styles.status} role="status">
          Loading transactions…
        </p>
      );
    }

    if (loadError) {
      return (
        <div className={styles.loadError}>
          <Alert>{loadError}</Alert>
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </div>
      );
    }

    if (transactions.length === 0) {
      const filtered = categoryId !== 'all';
      return (
        <EmptyState
          icon="transactions"
          title={filtered ? 'No transactions in this category' : `No transactions in ${formatMonth(month)}`}
          text={
            filtered
              ? 'Try another month or category, or add one now.'
              : 'Add your first income or expense for this month.'
          }
        >
          <Button icon="plus" onClick={() => setDialog({ kind: 'form', transaction: null })}>
            Add transaction
          </Button>
        </EmptyState>
      );
    }

    return (
      <TransactionList
        transactions={transactions}
        onEdit={(transaction) => setDialog({ kind: 'form', transaction })}
        onDelete={(transaction) => setDialog({ kind: 'delete', transaction })}
      />
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Transactions"
        subtitle={ready ? `${formatMonth(month)} · ${transactions.length} transactions` : formatMonth(month)}
      >
        <MonthPicker month={month} onChange={changeMonth} />
        <Button icon="plus" onClick={() => setDialog({ kind: 'form', transaction: null })} disabled={loading}>
          Add transaction
        </Button>
      </PageHeader>

      {ready && (
        <section className={styles.summary} aria-label="Summary of the list below">
          <SummaryCard tone="income" icon="arrowDownLeft" label="Income" value={formatSignedVnd(income, 'income')} />
          <SummaryCard tone="expense" icon="arrowUpRight" label="Expense" value={formatSignedVnd(expense, 'expense')} />
          <SummaryCard tone="net" icon="wallet" label="Net" value={formatVnd(income - expense)} />
        </section>
      )}

      <Card>
        <div className={styles.filters}>
          <label className={styles.filterLabel} htmlFor="category-filter">
            Category
          </label>
          <select id="category-filter" className={styles.select} value={categoryId} onChange={changeCategory}>
            <option value="all">All categories</option>
            <optgroup label="Expense">
              {categories
                .filter((c) => c.type === 'expense')
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Income">
              {categories
                .filter((c) => c.type === 'income')
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        {renderContent()}
      </Card>

      {dialog?.kind === 'form' && (
        <TransactionFormDialog
          transaction={dialog.transaction}
          categories={categories}
          onSaved={handleSaved}
          onClose={() => setDialog(null)}
          onDelete={(transaction) => setDialog({ kind: 'delete', transaction })}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteTransactionDialog
          transaction={dialog.transaction}
          onDeleted={handleDeleted}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
