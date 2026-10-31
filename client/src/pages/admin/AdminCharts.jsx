import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useReducedMotion } from 'motion/react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { cssVar } from '../../utils/cssVar.js';
import { formatCompact, formatNumber } from '../../utils/format.js';
import { countTicks } from '../../utils/admin.js';
import styles from './AdminCharts.module.css';

// A line chart of "how many per day" for the Admin page, in the approved style of docs/ui-style.md §9
// (smooth line, dashed horizontal grid, round axis steps, white tooltip card).
// data: [{ label, fullLabel, count }] (see toChartData). color: a CSS variable such as '--chart-1'.
// Recharts draws SVG, which needs real color values, so colors are read from tokens.css with cssVar().

const axisTick = () => ({ fill: cssVar('--chart-axis'), fontSize: cssVar('--font-size-xs') });

function CountTooltip({ active, payload, name }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{point.fullLabel}</p>
      <p className={styles.tooltipRow}>
        <span>{name}</span>
        <strong>{formatNumber(point.count)}</strong>
      </p>
    </div>
  );
}

export default function CountLineChart({ data, name, color, ariaLabel }) {
  useTheme(); // the colors below are read from the CSS variables, so draw again when the theme changes
  const animate = !useReducedMotion();
  const ticks = countTicks(Math.max(...data.map((d) => d.count), 0));
  const stroke = cssVar(color);
  const grid = cssVar('--chart-grid');

  return (
    <div className={styles.chart} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="4 6" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={10} minTickGap={24} tick={axisTick()} />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={48}
            ticks={ticks}
            domain={[0, ticks[ticks.length - 1]]}
            allowDecimals={false}
            tick={axisTick()}
            tickFormatter={formatCompact}
          />
          <Tooltip cursor={{ stroke: grid }} content={({ active, payload }) => <CountTooltip active={active} payload={payload} name={name} />} />
          <Line
            type="monotone"
            dataKey="count"
            name={name}
            isAnimationActive={animate}
            animationDuration={400}
            animationEasing="ease-out"
            stroke={stroke}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, stroke: cssVar('--color-surface'), strokeWidth: 2, fill: stroke }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
