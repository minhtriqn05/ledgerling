import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getYearlyReport } from '../../api/reports.js';
import { useLoad } from '../../hooks/useLoad.js';
import { formatVnd } from '../../utils/format.js';
import { formatMonthName, formatMonthShort } from '../../utils/vnDate.js';
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: report, loading, error, reload } = useLoad(() => getYearlyReport(year), [year]);

  if (loading) return <LoadingState skeleton="cards">{t('reports.loading')}</LoadingState>;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { totals, months, topExpenseMonth } = report;

  if (totals.income === 0 && totals.expense === 0) {
    return (
      <EmptyState
        icon="chart"
        title={t('transactions.noneInMonth', { month: year })}
        text={t('reports.emptyText')}
      >
        <Button icon="plus" onClick={() => navigate('/transactions')}>
          {t('transactions.add')}
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className={styles.tab}>
      <section className={styles.stats} aria-label={t('common.totalsFor', { period: year })}>
        <StatCard tone="income" icon="arrowDownLeft" label={t('common.totalIncome')} value={formatVnd(totals.income)} />
        <StatCard tone="expense" icon="arrowUpRight" label={t('common.totalExpense')} value={formatVnd(totals.expense)} />
        <StatCard tone="balance" icon="wallet" label={t('common.balance')} value={formatVnd(totals.balance)} />
      </section>

      <Card>
        <CardHeader icon="chart" tone="sky" title={t('reports.incomeExpenseByMonth')} subtitle={year}>
          <div className={styles.headerExtra}>
            {topExpenseMonth && (
              <p className={styles.topMonth}>
                <span>{t('reports.highestMonth')}</span>
                <strong>{formatMonthName(topExpenseMonth.month)}</strong>
                <span>{formatVnd(topExpenseMonth.expense)}</span>
              </p>
            )}
            <YearlyLegend />
          </div>
        </CardHeader>
        <YearlyChart months={months} year={year} />
      </Card>

      <Card>
        <CardHeader icon="transactions" tone="mint" title={t('reports.monthByMonth')} subtitle={year} />
        <div className={styles.tableWrap} role="region" tabIndex={0} aria-label={t('reports.monthByMonth')}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('reports.month')}</th>
                <th scope="col" className={styles.number}>{t('common.income')}</th>
                <th scope="col" className={styles.number}>{t('common.expense')}</th>
                <th scope="col" className={styles.number}>{t('common.balance')}</th>
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
