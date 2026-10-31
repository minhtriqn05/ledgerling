import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMonthlyReport } from '../../api/reports.js';
import { useLoad } from '../../hooks/useLoad.js';
import { useLiveRefresh } from '../../hooks/useLiveRefresh.js';
import { formatDate, formatPercent, formatVnd } from '../../utils/format.js';
import { categoryLabel } from '../../utils/emoji.js';
import { formatMonth } from '../../utils/vnDate.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import CollapsibleCard from '../../components/CollapsibleCard/CollapsibleCard.jsx';
import Button from '../../components/Button/Button.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import LoadingState from '../../components/LoadingState/LoadingState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: report, loading, error, reload, refresh } = useLoad(() => getMonthlyReport(month), [month]);
  useLiveRefresh(['transactions', 'categories'], refresh);

  if (loading) return <LoadingState skeleton="cards">{t('reports.loading')}</LoadingState>;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { totals, changes, topCategories, topTags, largestExpense } = report;

  // Nothing recorded this month: the cards and charts would only show zeros
  if (totals.income === 0 && totals.expense === 0) {
    return (
      <EmptyState
        icon="chart"
        title={t('transactions.noneInMonth', { month: formatMonth(month) })}
        text={t('reports.emptyText')}
      >
        <Button needsNetwork icon="plus" onClick={() => navigate('/transactions')}>
          {t('transactions.add')}
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className={styles.tab}>
      <section className={styles.stats} aria-label={t('common.totalsFor', { period: formatMonth(month) })}>
        <StatCard tone="income" icon="arrowDownLeft" label={t('common.income')} value={formatVnd(totals.income)}>
          <ChangeBadge percent={changes.income} kind="income" />
          {changes.income !== null && <span>{t('reports.vsLastMonth')}</span>}
        </StatCard>
        <StatCard tone="expense" icon="arrowUpRight" label={t('common.expense')} value={formatVnd(totals.expense)}>
          <ChangeBadge percent={changes.expense} kind="expense" />
          {changes.expense !== null && <span>{t('reports.vsLastMonth')}</span>}
        </StatCard>
        <StatCard tone="balance" icon="wallet" label={t('common.balance')} value={formatVnd(totals.balance)}>
          <ChangeBadge percent={changes.balance} kind="balance" />
          {changes.balance !== null && <span>{t('reports.vsLastMonth')}</span>}
        </StatCard>
      </section>

      <section className={styles.facts} aria-label={t('reports.quickFacts')}>
        <Fact icon="chart" tone="sky" label={t('reports.averagePerDay')} value={formatVnd(report.averagePerDay)} />
        <Fact
          icon="calendar"
          tone="mint"
          label={t('reports.noSpendDays')}
          value={report.noSpendDays}
          detail={t('reports.daysWithoutExpense', { count: report.noSpendDays })}
        />
        <Fact
          icon="arrowUpRight"
          tone="coral"
          label={t('reports.largestExpense')}
          value={largestExpense ? formatVnd(largestExpense.amount) : '—'}
          detail={
            largestExpense
              ? `${categoryLabel(largestExpense.category)} · ${formatDate(largestExpense.date)}${largestExpense.note ? ` · ${largestExpense.note}` : ''}`
              : t('reports.noExpensesThisMonth')
          }
        />
      </section>

      <section className={styles.row}>
        <CollapsibleCard id="reports.dailyExpense" className={styles.chartCard} icon="chart" tone="coral" title={t('reports.dailyExpense')} subtitle={formatMonth(month)}>
          <DailyExpenseChart dailyExpense={report.dailyExpense} month={month} />
        </CollapsibleCard>
        <InsightsCard month={month} cardId="reports.insights" />
      </section>

      <section className={styles.row}>
        <CollapsibleCard id="reports.topCategories" icon="pie" tone="sun" title={t('reports.topCategories')} subtitle={t('reports.whereMoneyWent')}>
          {topCategories.length === 0 ? (
            <p className={styles.note}>{t('dashboard.noExpenses', { month: formatMonth(month) })}</p>
          ) : (
            <div className={styles.tableWrap} role="region" tabIndex={0} aria-label={t('reports.topCategories')}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">{t('common.category')}</th>
                    <th scope="col" className={styles.number}>{t('reports.spent')}</th>
                    <th scope="col" className={`${styles.number} ${styles.hideSmall}`}>{t('reports.share')}</th>
                    <th scope="col" className={styles.number}>{t('reports.vsLastMonth')}</th>
                  </tr>
                </thead>
                <tbody>
                  {topCategories.map((c) => (
                    <tr key={c.categoryId} style={{ '--tone': c.color }}>
                      <th scope="row">
                        <span className={styles.categoryName}>
                          <CategoryMark category={c} />
                          <span>{c.name}</span>
                        </span>
                      </th>
                      <td className={styles.number}>{formatVnd(c.total)}</td>
                      <td className={`${styles.number} ${styles.hideSmall}`}>{formatPercent(c.percent)}</td>
                      <td className={styles.number}>
                        <ChangeBadge percent={c.changePercent} kind="expense" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleCard>

        <CollapsibleCard id="reports.topTags" icon="categories" tone="periwinkle" title={t('reports.topTags')} subtitle={t('reports.expenseByTag')}>
          {topTags.length === 0 ? (
            <p className={styles.note}>{t('reports.noTags', { month: formatMonth(month) })}</p>
          ) : (
            <ul className={styles.tags}>
              {topTags.map((item) => (
                <li key={item.tag}>
                  <span className={styles.tag}>#{item.tag}</span>
                  <span className={styles.tagCount}>
                    {t('transactions.count', { count: item.count })}
                  </span>
                  <strong>{formatVnd(item.total)}</strong>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>
      </section>
    </div>
  );
}
