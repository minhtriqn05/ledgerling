import { useNavigate } from 'react-router-dom';
import { getYearlyReport } from '../../api/reports.js';
import { useLoad } from '../../hooks/useLoad.js';
import { formatVnd } from '../../utils/format.js';
import { formatMonth, formatMonthShort } from '../../utils/vnDate.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import Button from '../../components/Button/Button.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import LoadingState from '../../components/LoadingState/LoadingState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import StatCard from './StatCard.jsx';
import { YearlyChart, YearlyLegend } from './ReportCharts.jsx';
import styles from './YearlyTab.module.css';

// The Yearly tab: income and expense of the 12 months as bars, the totals of the year and a table with the exact numbers.
// Everything comes from GET /api/reports/yearly.
export default function YearlyTab({ year }) {
  const navigate = useNavigate();
  const { data: report, loading, error, reload } = useLoad(() => getYearlyReport(year), [year]);

  if (loading) return <LoadingState skeleton="cards">Loading report…</LoadingState>;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { totals, months, topExpenseMonth } = report;

  if (totals.income === 0 && totals.expense === 0) {
    return (
      <EmptyState
        icon="chart"
        title={`No transactions in ${year}`}
        text="Add your first income or expense and this report will fill in."
      >
        <Button icon="plus" onClick={() => navigate('/transactions')}>
          Add transaction
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className={styles.tab}>
      <section className={styles.stats} aria-label={`Totals for ${year}`}>
        <StatCard tone="income" icon="arrowDownLeft" label="Total income" value={formatVnd(totals.income)} />
        <StatCard tone="expense" icon="arrowUpRight" label="Total expense" value={formatVnd(totals.expense)} />
        <StatCard tone="balance" icon="wallet" label="Balance" value={formatVnd(totals.balance)} />
      </section>

      <Card>
        <CardHeader icon="chart" tone="sky" title="Income and expense by month" subtitle={year}>
          <div className={styles.headerExtra}>
            {topExpenseMonth && (
              <p className={styles.topMonth}>
                <span>Highest-spending month:</span>
                <strong>{formatMonth(topExpenseMonth.month).replace(` ${year}`, '')}</strong>
                <span>{formatVnd(topExpenseMonth.expense)}</span>
              </p>
            )}
            <YearlyLegend />
          </div>
        </CardHeader>
        <YearlyChart months={months} year={year} />
      </Card>

      <Card>
        <CardHeader icon="transactions" tone="mint" title="Month by month" subtitle={year} />
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" className={styles.number}>Income</th>
                <th scope="col" className={styles.number}>Expense</th>
                <th scope="col" className={styles.number}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{formatMonthShort(m.month)}</th>
                  <td className={`${styles.number} ${styles.income}`}>{formatVnd(m.income)}</td>
                  <td className={`${styles.number} ${styles.expense}`}>{formatVnd(m.expense)}</td>
                  <td className={styles.number}>{formatVnd(m.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
