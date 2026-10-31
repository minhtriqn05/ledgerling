import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSummary } from '../api/stats.js';
import { getErrorMessage } from '../api/axios.js';
import { formatCompact, formatPercent, formatVnd } from '../utils/format.js';
import { currentMonth, formatMonth, formatMonthShort } from '../utils/vnDate.js';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import MonthPicker from '../components/MonthPicker/MonthPicker.jsx';
import Card, { CardHeader } from '../components/Card/Card.jsx';
import Button from '../components/Button/Button.jsx';
import EmptyState from '../components/EmptyState/EmptyState.jsx';
import LoadingState from '../components/LoadingState/LoadingState.jsx';
import ErrorState from '../components/ErrorState/ErrorState.jsx';
import Icon from '../components/Icon.jsx';
import CountUp from '../components/Motion/CountUp.jsx';
import Reveal from '../components/Motion/Reveal.jsx';
import BudgetAlerts from './dashboard/BudgetAlerts.jsx';
import GetStarted from './dashboard/GetStarted.jsx';
import SavingsGoals from './dashboard/SavingsGoals.jsx';
import CategoryMark from '../components/CategoryMark/CategoryMark.jsx';
import InsightsCard from './reports/InsightsCard.jsx';
import { CategoryDonut, MonthlyExpenseChart } from './dashboard/DashboardCharts.jsx';
import { useLiveRefresh } from '../hooks/useLiveRefresh.js';
import styles from './DashboardPage.module.css';

// Design: DashboardPreview in pages/styleGuide. Header with the month picker, three number cards,
// then the spending donut and the 6-month expense chart. All numbers come from GET /api/stats/summary.
// Plan: docs/plans/dashboard.md.

// One of the three number cards. tone: 'income' | 'expense' | 'balance' (balance is the vivid hero card).
// The amount counts up from 0 when the card appears.
function StatCard({ tone, icon, label, value, index }) {
  return (
    <Reveal as="article" index={index} className={`${styles.statCard} ${styles[tone]}`}>
      <span className={styles.statTile}>
        <Icon name={icon} size={18} />
      </span>
      <div className={styles.statText}>
        <span>{label}</span>
        <strong data-testid={`stat-${tone}`}>
          <CountUp value={value} format={formatVnd} />
        </strong>
      </div>
    </Reveal>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // "Try again" changes this, which runs the effect below again
  const [reloadKey, setReloadKey] = useState(0);

  // Everything on the page comes from one request, repeated whenever the month changes.
  useEffect(() => {
    let cancelled = false; // StrictMode runs effects twice in dev; ignore an outdated answer
    getSummary(month)
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setLoadError('');
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

  // Another device changed something: the numbers change in place, without a loading state
  useLiveRefresh(['transactions', 'categories', 'budgets', 'goals', 'recurring'], () => setReloadKey((key) => key + 1));

  // Shows "Loading…" again and clears an old error; every change that reloads the data calls this first.
  function startLoading() {
    setLoading(true);
    setLoadError('');
  }

  function changeMonth(nextMonth) {
    startLoading();
    setMonth(nextMonth);
  }

  function retry() {
    startLoading();
    setReloadKey((key) => key + 1);
  }

  // The page shows one of four states: loading, error, empty or the dashboard.
  function renderContent() {
    if (loading) return <LoadingState skeleton="cards">{t('dashboard.loading')}</LoadingState>;
    if (loadError) return <ErrorState message={loadError} onRetry={retry} />;

    // Nothing in the 6-month window at all: the cards and charts would only show zeros.
    const hasData = summary.byMonth.some((m) => m.income > 0 || m.expense > 0);
    if (!hasData) {
      // The "Get started" card shows the first steps and ticks the budget and goal steps by itself.
      return (
        <>
          <GetStarted />
          <EmptyState
            icon="chart"
            title={t('transactions.noneInMonth', { month: formatMonth(month) })}
            text={t('dashboard.emptyText')}
          >
            <Button needsNetwork icon="plus" onClick={() => navigate('/transactions')}>
              {t('transactions.add')}
            </Button>
          </EmptyState>
        </>
      );
    }

    const categories = summary.expenseByCategory;
    const categoryTotal = categories.reduce((sum, c) => sum + c.total, 0);
    const biggest = categories.length > 0 ? categories[0].total : 0; // the API sorts biggest first
    const monthlyExpense = summary.byMonth.map((m) => ({
      month: m.month,
      label: formatMonthShort(m.month),
      expense: m.expense,
    }));

    return (
      <>
        <section className={styles.stats} aria-label={t('common.totalsFor', { period: formatMonth(month) })}>
          <StatCard tone="income" index={0} icon="arrowDownLeft" label={t('common.totalIncome')} value={summary.totalIncome} />
          <StatCard tone="expense" index={1} icon="arrowUpRight" label={t('common.totalExpense')} value={summary.totalExpense} />
          <StatCard tone="balance" index={2} icon="wallet" label={t('common.balance')} value={summary.balance} />
        </section>

        <section className={styles.infoRow}>
          <BudgetAlerts month={month} />
          <SavingsGoals />
        </section>

        <InsightsCard month={month} />

        <section className={styles.chartsRow}>
          <Card>
            <CardHeader icon="pie" tone="sun" title={t('dashboard.spendingByCategory')} subtitle={formatMonth(month)} />
            {categories.length === 0 ? (
              <p className={styles.cardStatus}>{t('dashboard.noExpenses', { month: formatMonth(month) })}</p>
            ) : (
              <>
                <CategoryDonut data={categories} total={categoryTotal} />
                <ul className={styles.categoryList}>
                  {categories.map((c) => (
                    <li key={c.categoryId} style={{ '--tone': c.color }}>
                      <span className={styles.categoryName}>
                        <CategoryMark category={c} />
                        <span>{c.name}</span>
                      </span>
                      <span className={styles.categoryBar} aria-hidden="true">
                        <span style={{ width: `${(c.total / biggest) * 100}%` }} />
                      </span>
                      <span className={styles.categoryAmount}>{formatCompact(c.total)}</span>
                      <span className={styles.categoryShare}>{formatPercent(Math.round((c.total / categoryTotal) * 100))}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card>
            <CardHeader icon="chart" tone="sky" title={t('dashboard.expenseByMonth')} subtitle={t('dashboard.last6Months')} />
            <MonthlyExpenseChart data={monthlyExpense} selected={month} />
          </Card>
        </section>
      </>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title={t('nav.dashboard')} subtitle={t('dashboard.subtitle', { month: formatMonth(month) })}>
        <MonthPicker month={month} onChange={changeMonth} />
      </PageHeader>

      {renderContent()}
    </div>
  );
}
