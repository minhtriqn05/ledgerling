import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
} from 'recharts';
import { cssVar } from '../../utils/cssVar.js';
import { formatCompact, formatVnd } from '../../utils/format.js';
import styles from './DashboardCharts.module.css';

// The two charts of the Dashboard, in the approved style of docs/ui-style.md §9
// (reference: pages/styleGuide/PreviewCharts.jsx).
// Recharts draws SVG, which needs real color values, so colors are read from tokens.css with cssVar().

const axisTick = () => ({ fill: cssVar('--chart-axis'), fontSize: cssVar('--font-size-xs') });

// Round axis steps so labels read naturally (0, 6M, 12M... instead of 5.5M, 16.5M...).
export function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const rawStep = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * magnitude).find((s) => s >= rawStep);
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

// Small white card shown on hover.
export function ChartTooltip({ active, payload, label, hideLabel = false }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      {!hideLabel && <p className={styles.tooltipLabel}>{label}</p>}
      {payload.map((item) => {
        const color = item.payload?.fill;
        return (
          <p key={item.name} className={styles.tooltipRow}>
            {color && <span className={styles.dot} style={{ background: color }} />}
            <span>{item.payload?.icon ? `${item.payload.icon} ${item.name}` : item.name}</span>
            <strong>{formatVnd(item.value)}</strong>
          </p>
        );
      })}
    </div>
  );
}

// Share of spending per category: a thin ring of rounded segments with small gaps, the total in the middle.
// data: [{ name, color (hex of the category), total }]
export function CategoryDonut({ data, total }) {
  const pieData = data.map((c) => ({ ...c, fill: c.color }));

  return (
    <div className={styles.donut} role="img" aria-label={`Spending by category, total ${formatVnd(total)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            dataKey="total"
            nameKey="name"
            innerRadius="79%"
            outerRadius="100%"
            paddingAngle={data.length > 1 ? 3 : 0}
            cornerRadius={8}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          />
          <Tooltip content={<ChartTooltip hideLabel />} />
        </PieChart>
      </ResponsiveContainer>
      <div className={styles.donutCenter}>
        <strong>{formatCompact(total)}&nbsp;₫</strong>
        <span>spent</span>
      </div>
    </div>
  );
}

// Expense of the last months: pastel capsules; the selected month uses the sky-to-teal gradient.
// data: [{ month: 'YYYY-MM', label: 'Oct', expense }], selected: the 'YYYY-MM' to highlight.
export function MonthlyExpenseChart({ data, selected }) {
  const bar = cssVar('--chart-bar');
  const grid = cssVar('--chart-grid');
  const from = cssVar('--color-hero-from');
  const to = cssVar('--color-hero-to');
  const ticks = niceTicks(Math.max(...data.map((d) => d.expense)));

  return (
    <div className={styles.barChart} role="img" aria-label="Expense of the last 6 months">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barCategoryGap="30%">
          <defs>
            <linearGradient id="dashboard-selected-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={from} />
              <stop offset="100%" stopColor={to} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="4 6" />
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
          <Tooltip cursor={false} content={<ChartTooltip />} />
          <Bar dataKey="expense" name="Expense" maxBarSize={24} radius={999}>
            {data.map((d) => (
              <Cell key={d.month} fill={d.month === selected ? 'url(#dashboard-selected-fill)' : bar} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
