import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { cssVar } from '../../utils/cssVar.js';
import { formatCompact } from '../../utils/format.js';
import { formatLongDay } from '../../utils/reports.js';
import { formatMonth, formatMonthShort } from '../../utils/vnDate.js';
import { ChartTooltip, niceTicks } from '../dashboard/DashboardCharts.jsx';
import styles from './ReportCharts.module.css';

// The two charts of the Reports page, in the approved style of docs/ui-style.md §9:
// smooth lines, dashed horizontal grid, round axis steps, white tooltip card, capsule bars.
// Recharts draws SVG, which needs real color values, so colors are read from tokens.css with cssVar().

const axisTick = () => ({ fill: cssVar('--chart-axis'), fontSize: cssVar('--font-size-xs') });

// Expense of every day of one month as a smooth line.
// dailyExpense: [{ date: 'YYYY-MM-DD', total }], one entry per day (the monthly report sends them all).
export function DailyExpenseChart({ dailyExpense, month }) {
  const data = dailyExpense.map((d) => ({
    day: Number(d.date.slice(8, 10)),
    fullLabel: formatLongDay(d.date),
    expense: d.total,
  }));
  const ticks = niceTicks(Math.max(...data.map((d) => d.expense)));
  const color = cssVar('--color-expense');
  const grid = cssVar('--chart-grid');

  return (
    <div className={styles.chart} role="img" aria-label={`Expense of each day of ${formatMonth(month)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="4 6" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10} interval={4} tick={axisTick()} />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={48}
            ticks={ticks}
            domain={[0, ticks[ticks.length - 1]]}
            tick={axisTick()}
            tickFormatter={formatCompact}
          />
          <Tooltip
            cursor={{ stroke: grid }}
            content={({ active, payload }) => (
              <ChartTooltip active={active} payload={payload} label={payload?.[0]?.payload.fullLabel} />
            )}
          />
          <Line
            type="monotone"
            dataKey="expense"
            name="Expense"
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, stroke: cssVar('--color-surface'), strokeWidth: 2, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Income and expense of the 12 months of a year as pairs of capsule bars.
// months: [{ month: 'YYYY-MM', income, expense }]
export function YearlyChart({ months, year }) {
  const data = months.map((m) => ({ ...m, label: formatMonthShort(m.month), fullLabel: formatMonth(m.month) }));
  const ticks = niceTicks(Math.max(...data.map((d) => Math.max(d.income, d.expense))));

  return (
    <div className={styles.chart} role="img" aria-label={`Income and expense of each month of ${year}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barCategoryGap="25%" barGap={3}>
          <CartesianGrid vertical={false} stroke={cssVar('--chart-grid')} strokeDasharray="4 6" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={10} interval={0} tick={axisTick()} />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={48}
            ticks={ticks}
            domain={[0, ticks[ticks.length - 1]]}
            tick={axisTick()}
            tickFormatter={formatCompact}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => (
              <ChartTooltip active={active} payload={payload} label={payload?.[0]?.payload.fullLabel} />
            )}
          />
          <Bar dataKey="income" name="Income" fill={cssVar('--color-income')} maxBarSize={10} radius={999} />
          <Bar dataKey="expense" name="Expense" fill={cssVar('--color-expense')} maxBarSize={10} radius={999} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Small legend for the yearly chart, shown in the card header
export function YearlyLegend() {
  return (
    <ul className={styles.legend} aria-hidden="true">
      <li>
        <i className={`${styles.legendDot} ${styles.incomeDot}`} /> Income
      </li>
      <li>
        <i className={`${styles.legendDot} ${styles.expenseDot}`} /> Expense
      </li>
    </ul>
  );
}
