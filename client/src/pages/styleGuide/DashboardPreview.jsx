import PreviewShell, { AddButton, CardHeader, MonthPicker, Topbar } from './PreviewShell.jsx';
import Icon from './icons.jsx';
import { BalanceSparkline, CashflowChart, CategoryDonut, WeeklySpendingChart } from './PreviewCharts.jsx';
import {
  user,
  summary,
  balanceTrend,
  cashflow,
  spendingByCategory,
  weeklySpending,
  recentTransactions,
} from './sampleData.js';
import { formatCompact, formatDayMonth, formatNumber, formatSignedVnd } from '../../utils/format.js';
import ui from './ui.module.css';
import styles from './DashboardPreview.module.css';

// Static mock of the Dashboard page. The real page will load these numbers from the API.

// 8.2 -> "↑ 8.2% vs September", -5 -> "↓ 5% vs September"
const formatChange = (change) => `${change >= 0 ? '↑' : '↓'} ${Math.abs(change)}% vs September`;

export default function DashboardPreview() {
  const spentShare = Math.round((summary.expense / summary.income) * 100);
  const savedShare = 100 - spentShare;
  const totalSpent = spendingByCategory.reduce((sum, c) => sum + c.amount, 0);
  const biggest = Math.max(...spendingByCategory.map((c) => c.amount));
  const weekTotal = weeklySpending.reduce((sum, d) => sum + d.amount, 0);
  const topDay = weeklySpending.reduce((top, d) => (d.amount > top.amount ? d : top));

  return (
    <PreviewShell active="dashboard">
      <Topbar title={`Good morning, ${user.name}`} subtitle="Here is how October is going.">
        <MonthPicker />
        <AddButton />
      </Topbar>

      <section className={styles.stats}>
        <article className={styles.hero}>
          <div className={styles.heroTop}>
            <span className={styles.heroLabel}>
              <Icon name="wallet" size={18} />
              Total balance
            </span>
            <span className={styles.heroPill}>{formatChange(summary.balanceChange)}</span>
          </div>
          <p className={styles.heroValue}>
            {formatNumber(summary.balance)}
            <span className={styles.heroUnit}>₫</span>
          </p>
          <div className={styles.sparkline}>
            <BalanceSparkline data={balanceTrend} colorVar="--color-hero-text" />
          </div>
        </article>

        <article className={ui.card}>
          <div className={styles.statHead}>
            <span className={`${ui.tile} ${ui.toneIncome}`}>
              <Icon name="arrowDownLeft" size={18} />
            </span>
            <span className={styles.statLabel}>Income</span>
          </div>
          <p className={styles.statValue}>
            {formatNumber(summary.income)}
            <span className={ui.unit}>₫</span>
          </p>
          <span className={styles.statDelta}>{formatChange(summary.incomeChange)}</span>
          <div className={styles.statBottom}>
            <div className={`${ui.progress} ${ui.toneIncome}`} aria-hidden="true">
              <span style={{ width: `${savedShare}%` }} />
            </div>
            <span>{savedShare}% of income saved</span>
          </div>
        </article>

        <article className={ui.card}>
          <div className={styles.statHead}>
            <span className={`${ui.tile} ${ui.toneExpense}`}>
              <Icon name="arrowUpRight" size={18} />
            </span>
            <span className={styles.statLabel}>Expense</span>
          </div>
          <p className={styles.statValue}>
            {formatNumber(summary.expense)}
            <span className={ui.unit}>₫</span>
          </p>
          <span className={styles.statDelta}>{formatChange(summary.expenseChange)}</span>
          <div className={styles.statBottom}>
            <div className={`${ui.progress} ${ui.toneExpense}`} aria-hidden="true">
              <span style={{ width: `${spentShare}%` }} />
            </div>
            <span>{spentShare}% of income spent</span>
          </div>
        </article>
      </section>

      <section className={styles.chartsRow}>
        <article className={ui.card}>
          <CardHeader icon="chart" tone={ui.toneSky} title="Cash flow" subtitle="Last 6 months">
            <div className={styles.legend}>
              <span>
                <i className={`${ui.dot} ${ui.toneIncome}`} />
                Income
              </span>
              <span>
                <i className={`${ui.dot} ${ui.toneExpense}`} />
                Expense
              </span>
            </div>
          </CardHeader>
          <div className={styles.chartFill}>
            <CashflowChart data={cashflow} />
          </div>
        </article>

        <article className={ui.card}>
          <CardHeader icon="pie" tone={ui.toneSun} title="Spending by category" subtitle="October" />
          <CategoryDonut data={spendingByCategory} total={totalSpent} />
          <ul className={styles.categoryList}>
            {spendingByCategory.map((c) => (
              <li key={c.id} style={{ '--tone': `var(${c.color})` }}>
                <span className={styles.categoryName}>
                  <i className={ui.dot} />
                  {c.name}
                </span>
                <span className={styles.categoryBar} aria-hidden="true">
                  <span style={{ width: `${(c.amount / biggest) * 100}%` }} />
                </span>
                <span className={styles.categoryAmount}>{formatCompact(c.amount)}</span>
                <span className={styles.categoryShare}>{Math.round((c.amount / totalSpent) * 100)}%</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className={styles.bottomRow}>
        <article className={ui.card}>
          <CardHeader icon="calendar" tone={ui.toneMint} title="This week" subtitle={`Highest on ${topDay.label}`} />
          <p className={styles.weekTotal}>
            {formatNumber(weekTotal)}
            <span className={ui.unit}>₫</span>
            <span className={styles.weekNote}>spent</span>
          </p>
          <div className={styles.chartFill}>
            <WeeklySpendingChart data={weeklySpending} />
          </div>
        </article>

        <article className={ui.card}>
          <CardHeader icon="receipt" tone={ui.tonePeriwinkle} title="Recent transactions" subtitle="Last 5 entries">
            <button type="button" className={`${ui.btn} ${ui.btnGhost} ${styles.viewAll}`}>
              View all
            </button>
          </CardHeader>
          <ul className={styles.txList}>
            {recentTransactions.map((t) => (
              <li key={t.id} className={styles.txRow}>
                <span className={ui.avatar} style={{ '--tone': `var(${t.color})` }}>
                  {t.category[0]}
                </span>
                <span className={styles.txText}>
                  <strong>{t.note}</strong>
                  <span>
                    {t.category} · {formatDayMonth(t.date)}
                  </span>
                </span>
                <span className={`${ui.amount} ${t.type === 'income' ? ui.income : ui.expense}`}>
                  {formatSignedVnd(t.amount, t.type)}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </PreviewShell>
  );
}
