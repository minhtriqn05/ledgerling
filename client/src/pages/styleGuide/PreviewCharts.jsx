import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
} from 'recharts';
import { cssVar } from '../../utils/cssVar.js';
import { formatCompact, formatVnd } from '../../utils/format.js';
import styles from './PreviewCharts.module.css';

// The four chart styles of Ledgerling (docs/ui-style.md, "Charts").
// Recharts draws SVG, which needs real color values, so colors are read from tokens.css with cssVar().

const axisTick = () => ({ fill: cssVar('--chart-axis'), fontSize: cssVar('--font-size-xs') });

// Round axis steps so labels read naturally (0, 6M, 12M, 18M, 24M instead of 5.5M, 16.5M...).
function niceTicks(max, count = 4) {
  const rawStep = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * magnitude).find((s) => s >= rawStep);
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

// Small white card shown on hover. `colors` maps a dataKey to its dot color.
function ChartTooltip({ active, payload, label, hideLabel = false, colors = {} }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      {!hideLabel && <p className={styles.tooltipLabel}>{label}</p>}
      {payload.map((item) => {
        const color = colors[item.dataKey] ?? item.payload?.fill;
        return (
          <p key={item.name} className={styles.tooltipRow}>
            {color && <span className={styles.dot} style={{ background: color }} />}
            <span>{item.name}</span>
            <strong>{formatVnd(item.value)}</strong>
          </p>
        );
      })}
    </div>
  );
}

// Pill above the highest bar, e.g. "650K". Recharts passes the bar position in `viewBox`.
// (Own prop names: LabelList also passes the bar's `fill`, which would override a prop called `fill`.)
function PeakLabel({ viewBox, value, peak, pillFill, textColor }) {
  if (value !== peak || !viewBox) return null;
  const center = viewBox.x + viewBox.width / 2;
  return (
    <g>
      <rect x={center - 24} y={viewBox.y - 30} width={48} height={22} rx={11} fill={pillFill} />
      <text
        x={center}
        y={viewBox.y - 15}
        textAnchor="middle"
        fill={textColor}
        fontSize={cssVar('--font-size-xs')}
        fontWeight={600}
      >
        {formatCompact(value)}
      </text>
    </g>
  );
}

// Income vs expense over several months: smooth lines; only income gets a fading color wash,
// so the two fills never mix into a muddy color.
export function CashflowChart({ data }) {
  const income = cssVar('--color-income');
  const expense = cssVar('--color-expense');
  const grid = cssVar('--chart-grid');
  const surface = cssVar('--color-surface');
  const ticks = niceTicks(Math.max(...data.map((d) => Math.max(d.income, d.expense))));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="sg-income-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={income} stopOpacity={0.25} />
            <stop offset="100%" stopColor={income} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={grid} strokeDasharray="4 6" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          interval={0}
          padding={{ left: 8, right: 8 }}
          tick={axisTick()}
        />
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
          cursor={{ stroke: grid, strokeWidth: 2 }}
          content={<ChartTooltip colors={{ income, expense }} />}
        />
        <Area
          type="monotone"
          dataKey="income"
          name="Income"
          stroke={income}
          strokeWidth={2.5}
          fill="url(#sg-income-fill)"
          dot={false}
          activeDot={{ r: 5, fill: income, stroke: surface, strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="expense"
          name="Expense"
          stroke={expense}
          strokeWidth={2.5}
          fill="none"
          dot={false}
          activeDot={{ r: 5, fill: expense, stroke: surface, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// One value per day: pastel capsules on a light track. The highest day gets the
// sky-to-teal gradient and a small label with its amount.
export function WeeklySpendingChart({ data }) {
  const bar = cssVar('--chart-bar');
  const track = cssVar('--chart-bar-track');
  const from = cssVar('--color-hero-from');
  const to = cssVar('--color-hero-to');
  const labelColor = cssVar('--color-hero-text');
  const max = Math.max(...data.map((d) => d.amount));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="30%">
        <defs>
          <linearGradient id="sg-peak-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10} interval={0} tick={axisTick()} />
        <YAxis hide domain={[0, (dataMax) => dataMax * 1.3]} />
        <Tooltip cursor={false} content={<ChartTooltip />} />
        <Bar dataKey="amount" name="Spent" maxBarSize={16} radius={999} background={{ fill: track, radius: 999 }}>
          {data.map((d) => (
            <Cell key={d.day} fill={d.amount === max ? 'url(#sg-peak-fill)' : bar} />
          ))}
          <LabelList
            dataKey="amount"
            content={<PeakLabel peak={max} pillFill="url(#sg-peak-fill)" textColor={labelColor} />}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Share of spending per category: a thin ring of rounded segments with small gaps,
// and the total in the middle.
export function CategoryDonut({ data, total }) {
  const pieData = data.map((c) => ({ ...c, fill: cssVar(c.color) }));

  return (
    <div className={styles.donut}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            dataKey="amount"
            nameKey="name"
            innerRadius="79%"
            outerRadius="100%"
            paddingAngle={3}
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

// Tiny trend line: no axes, no tooltip, just the shape. White on the hero card.
export function BalanceSparkline({ data, colorVar = '--color-primary' }) {
  const color = cssVar(colorVar);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="sg-balance-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={['dataMin - 1', 'dataMax + 0.5']} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#sg-balance-fill)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
