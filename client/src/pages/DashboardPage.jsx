import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSummary } from '../api/stats.js';
import { getErrorMessage } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCompact, formatNumber, formatPercent } from '../utils/format.js';
import { currentMonth, formatMonth, formatMonthShort, vietnamHour } from '../utils/vnDate.js';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import MonthPicker from '../components/MonthPicker/MonthPicker.jsx';
import CollapsibleCard from '../components/CollapsibleCard/CollapsibleCard.jsx';
import Button from '../components/Button/Button.jsx';
import EmptyState from '../components/EmptyState/EmptyState.jsx';
import LoadingState from '../components/LoadingState/LoadingState.jsx';
import ErrorState from '../components/ErrorState/ErrorState.jsx';
import Icon from '../components/Icon.jsx';
import CountUp from '../components/Motion/CountUp.jsx';
import Reveal from '../components/Motion/Reveal.jsx';
import BudgetAlerts from './dashboard/BudgetAlerts.jsx';
import GetStarted from './dashboard/GetStarted.jsx';
import RecentTransactions from './dashboard/RecentTransactions.jsx';
import SavingsGoals from './dashboard/SavingsGoals.jsx';
import WalletsCard from './dashboard/WalletsCard.jsx';
import CategoryMark from '../components/CategoryMark/CategoryMark.jsx';
import InsightsCard from './reports/InsightsCard.jsx';
import { CategoryDonut, MonthlyExpenseChart } from './dashboard/DashboardCharts.jsx';
import { useLiveRefresh } from '../hooks/useLiveRefresh.js';
import styles from './DashboardPage.module.css';

// Header: the hero with the balance of the month, income and expense with their last 6 months.
// Below it two columns: the charts and the newest transactions on the left, a narrower rail with the wallets, budget alerts,
// goals and insights on the right. All the numbers of the hero and the charts come from GET /api/stats/summary.
// The cards of the rail load their own data. Plan: docs/plans/premium-redesign.md.

// The first words of the hero, by the hour in Vietnam (keys in dashboard.greeting)
function greetingKey(hour) {
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

// The amount with a smaller, softer ₫ next to it
const heroAmount = (value) => (
  <>
    {formatNumber(value)}
    <small>&nbsp;₫</small>
  </>
);

// Income or expense in the hero, with six small capsules: the same number over the last months, the chosen month lit.
function HeroTile({ tone, icon, label, value, series }) {
  const biggest = Math.max(...series, 1);
  return (
    <Reveal as="article" index={1} className={`${styles.tile} ${styles[tone]}`}>
      <div className={styles.tileHead}>
        <span className={styles.tileIcon}>
          <Icon name={icon} size={16} />
        </span>
        <span>{label}</span>
      </div>
      <strong data-testid={`stat-${tone}`} className={styles.tileValue}>
        <CountUp value={value} format={heroAmount} />
      </strong>
      <span className={styles.spark} aria-hidden="true">
        {series.map((amount, index) => (
          <span key={index} className={index === series.length - 1 ? styles.sparkNow : ''} style={{ height: `${Math.max((amount / biggest) * 100, 8)}%` }} />
        ))}
      </span>
    </Reveal>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // "Try again" changes this, which runs the effect below again
  const [reloadKey, setReloadKey] = useState(0);

  // Everything in the hero and the charts comes from one request, repeated whenever the month changes.
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

  const ready = !loading && !loadError;
  // Nothing in the 6-month window at all: the numbers and charts would only show zeros.
  const hasData = ready && summary.byMonth.some((m) => m.income > 0 || m.expense > 0);

  // The numbers in the hero. byMonth ends with the chosen month.
  function renderHeroStats() {
    const savedShare = summary.totalIncome > 0 ? Math.round((summary.balance / summary.totalIncome) * 100) : null;
    return (
      <section className={styles.heroStats} aria-label={t('common.totalsFor', { period: formatMonth(month) })}>
        <Reveal as="article" className={styles.balance}>
          <span className="eyebrow">{t('common.balance')}</span>
          <strong data-testid="stat-balance" className={styles.balanceValue}>
            <CountUp value={summary.balance} format={heroAmount} />
          </strong>
          {savedShare !== null && savedShare > 0 && (
            <span className={styles.saved}>
              <Icon name="sprout" size={14} />
              {t('dashboard.savedShare', { percent: formatPercent(savedShare) })}
            </span>
          )}
        </Reveal>
        <HeroTile tone="income" icon="arrowDownLeft" label={t('common.totalIncome')} value={summary.totalIncome} series={summary.byMonth.map((m) => m.income)} />
        <HeroTile tone="expense" icon="arrowUpRight" label={t('common.totalExpense')} value={summary.totalExpense} series={summary.byMonth.map((m) => m.expense)} />
      </section>
    );
  }

  // The part under the hero shows one of four states: loading, error, empty or the two columns.
  function renderContent() {
    if (loading) return <LoadingState skeleton="cards">{t('dashboard.loading')}</LoadingState>;
    if (loadError) return <ErrorState message={loadError} onRetry={retry} />;

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
      <div className={styles.columns}>
        <div className={styles.mainColumn}>
          <CollapsibleCard id="dashboard.expenseByMonth" icon="chart" tone="sky" title={t('dashboard.expenseByMonth')} subtitle={t('dashboard.last6Months')}>
            <MonthlyExpenseChart data={monthlyExpense} selected={month} />
          </CollapsibleCard>

          <CollapsibleCard id="dashboard.spendingByCategory" icon="pie" tone="sun" title={t('dashboard.spendingByCategory')} subtitle={formatMonth(month)}>
            {categories.length === 0 ? (
              <p className={styles.cardStatus}>{t('dashboard.noExpenses', { month: formatMonth(month) })}</p>
            ) : (
              <div className={styles.spending}>
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
              </div>
            )}
          </CollapsibleCard>

          <RecentTransactions month={month} />
        </div>

        <div className={styles.rail}>
          <WalletsCard />
          <section className={styles.railGroup}>
            <BudgetAlerts month={month} />
            <SavingsGoals />
          </section>
          <InsightsCard month={month} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        logo
        eyebrow={user?.name ? t(`dashboard.greeting.${greetingKey(vietnamHour())}`, { name: user.name }) : undefined}
        title={t('nav.dashboard')}
        subtitle={t('dashboard.subtitle', { month: formatMonth(month) })}
        stats={hasData ? renderHeroStats() : null}
      >
        <MonthPicker month={month} onChange={changeMonth} />
      </PageHeader>

      {renderContent()}
    </div>
  );
}
