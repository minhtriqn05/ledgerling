import { useNavigate } from 'react-router-dom';
import { getMonthlyReport } from '../../api/reports.js';
import { useLoad } from '../../hooks/useLoad.js';
import { formatDate, formatVnd } from '../../utils/format.js';
import { categoryLabel } from '../../utils/emoji.js';
import { formatMonth } from '../../utils/vnDate.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import Button from '../../components/Button/Button.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import LoadingState from '../../components/LoadingState/LoadingState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import ChangeBadge from './ChangeBadge.jsx';
import InsightsCard from './InsightsCard.jsx';
import StatCard from './StatCard.jsx';
import { DailyExpenseChart } from './ReportCharts.jsx';
import styles from './MonthlyTab.module.css';

// One small fact under the cards: a label and a big value, with an optional second line
function Fact({ icon, tone, label, value, detail }) {
  return (
    <Card className={styles.fact}>
      <CardHeader icon={icon} tone={tone} title={label} />
      <strong className={styles.factValue}>{value}</strong>
      {detail && <p className={styles.factDetail}>{detail}</p>}
    </Card>
  );
}

// The Monthly tab: three cards with the change from last month, the daily expense line, the insights,
// the top 5 categories and tags, and a few facts. Everything comes from GET /api/reports/monthly.
export default function MonthlyTab({ month }) {
  const navigate = useNavigate();
  const { data: report, loading, error, reload } = useLoad(() => getMonthlyReport(month), [month]);

  if (loading) return <LoadingState skeleton="cards">Loading report…</LoadingState>;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { totals, changes, topCategories, topTags, largestExpense } = report;

  // Nothing recorded this month: the cards and charts would only show zeros
  if (totals.income === 0 && totals.expense === 0) {
    return (
      <EmptyState
        icon="chart"
        title={`No transactions in ${formatMonth(month)}`}
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
      <section className={styles.stats} aria-label={`Totals for ${formatMonth(month)}`}>
        <StatCard tone="income" icon="arrowDownLeft" label="Income" value={formatVnd(totals.income)}>
          <ChangeBadge percent={changes.income} kind="income" />
          {changes.income !== null && <span>vs last month</span>}
        </StatCard>
        <StatCard tone="expense" icon="arrowUpRight" label="Expense" value={formatVnd(totals.expense)}>
          <ChangeBadge percent={changes.expense} kind="expense" />
          {changes.expense !== null && <span>vs last month</span>}
        </StatCard>
        <StatCard tone="balance" icon="wallet" label="Balance" value={formatVnd(totals.balance)}>
          <ChangeBadge percent={changes.balance} kind="balance" />
          {changes.balance !== null && <span>vs last month</span>}
        </StatCard>
      </section>

      <section className={styles.facts} aria-label="Quick facts">
        <Fact icon="chart" tone="sky" label="Average per day" value={formatVnd(report.averagePerDay)} />
        <Fact
          icon="calendar"
          tone="mint"
          label="No-spend days"
          value={report.noSpendDays}
          detail={report.noSpendDays === 1 ? 'day without an expense' : 'days without an expense'}
        />
        <Fact
          icon="arrowUpRight"
          tone="coral"
          label="Largest expense"
          value={largestExpense ? formatVnd(largestExpense.amount) : '—'}
          detail={
            largestExpense
              ? `${categoryLabel(largestExpense.category)} · ${formatDate(largestExpense.date)}${largestExpense.note ? ` · ${largestExpense.note}` : ''}`
              : 'No expenses this month'
          }
        />
      </section>

      <section className={styles.row}>
        <Card className={styles.chartCard}>
          <CardHeader icon="chart" tone="coral" title="Daily expense" subtitle={formatMonth(month)} />
          <DailyExpenseChart dailyExpense={report.dailyExpense} month={month} />
        </Card>
        <InsightsCard month={month} />
      </section>

      <section className={styles.row}>
        <Card>
          <CardHeader icon="pie" tone="sun" title="Top categories" subtitle="Where the money went" />
          {topCategories.length === 0 ? (
            <p className={styles.note}>No expenses in {formatMonth(month)}.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col" className={styles.number}>Spent</th>
                    <th scope="col" className={`${styles.number} ${styles.hideSmall}`}>Share</th>
                    <th scope="col" className={styles.number}>vs last month</th>
                  </tr>
                </thead>
                <tbody>
                  {topCategories.map((c) => (
                    <tr key={c.categoryId} style={{ '--tone': c.color }}>
                      <th scope="row">
                        <span className={styles.categoryName}>
                          <i className={styles.dot} aria-hidden="true" />
                          {c.icon && <span aria-hidden="true">{c.icon}</span>}
                          <span>{c.name}</span>
                        </span>
                      </th>
                      <td className={styles.number}>{formatVnd(c.total)}</td>
                      <td className={`${styles.number} ${styles.hideSmall}`}>{c.percent}%</td>
                      <td className={styles.number}>
                        <ChangeBadge percent={c.changePercent} kind="expense" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader icon="categories" tone="periwinkle" title="Top tags" subtitle="Expense by tag" />
          {topTags.length === 0 ? (
            <p className={styles.note}>No tags used on expenses in {formatMonth(month)}.</p>
          ) : (
            <ul className={styles.tags}>
              {topTags.map((t) => (
                <li key={t.tag}>
                  <span className={styles.tag}>#{t.tag}</span>
                  <span className={styles.tagCount}>
                    {t.count} {t.count === 1 ? 'transaction' : 'transactions'}
                  </span>
                  <strong>{formatVnd(t.total)}</strong>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
