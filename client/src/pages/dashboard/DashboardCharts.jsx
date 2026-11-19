import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
} from 'recharts';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'motion/react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { cssVar } from '../../utils/cssVar.js';
import { formatCompact, formatVnd } from '../../utils/format.js';
import { tooltipLeft } from '../../utils/chartTooltip.js';
import styles from './DashboardCharts.module.css';

// The two charts of the Dashboard, in the style of docs/ui-style.md §9.
// Recharts draws SVG, which needs real color values, so colors are read from tokens.css with cssVar().

const axisTick = () => ({ fill: cssVar('--chart-axis'), fontSize: cssVar('--font-size-xs') });

// The tooltip card of every chart stands just above the chart, over the column (or the day) under the pointer, and
// never past the left or right edge of the chart: it never covers a bar, the line or the total in the middle of the
// donut. It moves at once from one column to the next (no glide) and hides when the pointer leaves the chart.
// Spread on <Tooltip>: Recharts' own box then has the size of the chart and ChartTooltip places the card in it.
export const TOOLTIP_PROPS = {
  isAnimationActive: false,
  position: { x: 0, y: 0 },
  wrapperStyle: { width: '100%', height: '100%', zIndex: 2 },
};

// A finger has no "mouse leave", so the tooltip would stay on screen after a tap on a chart. The next touch outside
// the chart hides it and a touch on the chart shows it again (a mouse leaving the chart is handled by Recharts).
//   const [chartRef, tooltipActive] = useTapAway();  <div ref={chartRef}>...<Tooltip active={tooltipActive} /></div>
export function useTapAway() {
  const ref = useRef(null);
  const [away, setAway] = useState(false);

  useEffect(() => {
    function handlePointerDown(event) {
      if (event.pointerType === 'mouse') return;
      const inside = Boolean(ref.current?.contains(event.target));
      // Only a card on screen needs hiding: any other touch outside changes nothing, so the chart is not drawn again
      // (a new render of a Recharts chart inside the touch event made the first touch of a page 60 ms long at 4x CPU)
      if (!inside && !ref.current?.querySelector(`.${styles.tooltip}`)) return;
      setAway(!inside);
    }
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, []);

  // undefined: Recharts decides (hover, touch); false: hidden
  return [ref, away ? false : undefined];
}

// Round axis steps so labels read naturally (0, 6M, 12M... instead of 5.5M, 16.5M...).
export function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const rawStep = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * magnitude).find((s) => s >= rawStep);
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

// The bar that stays at the top of the window (the top bar of a phone or of a wide screen) and what it covers
const coveredTop = () => parseFloat(cssVar('--topbar-height')) + parseFloat(cssVar('--frame-gap')) + 8;

// Small card shown on hover or touch, placed as TOOLTIP_PROPS says. Recharts passes active, payload, label and
// coordinate (x: the middle of the column under the pointer). center: over the middle of the chart (the donut).
export function ChartTooltip({ active, payload, label, hideLabel = false, coordinate, center = false }) {
  const ref = useRef(null);
  const [place, setPlace] = useState(null);

  // Measured before the browser paints, so the card is never seen at a wrong place
  useLayoutEffect(() => {
    const card = ref.current;
    const frame = card?.offsetParent; // the box of Recharts, as big as the chart
    if (!card || !frame) return;
    const left = tooltipLeft(frame.clientWidth, card.offsetWidth, center ? null : coordinate?.x);
    // Above the chart, unless the chart is so high in the window that the top bar would hide the card
    const inside = frame.getBoundingClientRect().top - card.offsetHeight - 4 < coveredTop();
    setPlace((old) => (old?.left === left && old?.inside === inside ? old : { left, inside }));
  });

  if (!active || !payload?.length) return null;
  return (
    <div ref={ref} className={`${styles.tooltip} ${place?.inside ? styles.tooltipInside : ''}`} style={{ transform: `translateX(${place?.left ?? 0}px)` }}>
      {!hideLabel && <p className={styles.tooltipLabel}>{label}</p>}
      {payload.map((item) => {
        const color = item.payload?.fill;
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

// Share of spending per category: a ring of rounded segments with small gaps, the total in the middle.
// data: [{ name, color (hex of the category), total }]
export function CategoryDonut({ data, total }) {
  const { t } = useTranslation();
  const animate = !useReducedMotion();
  const pieData = data.map((c) => ({ ...c, fill: c.color }));
  const [chartRef, tooltipActive] = useTapAway();

  return (
    <div ref={chartRef} className={styles.donut} role="img" aria-label={t('dashboard.donutLabel', { total: formatVnd(total) })}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            dataKey="total"
            nameKey="name"
            innerRadius="74%"
            outerRadius="100%"
            paddingAngle={data.length > 1 ? 4 : 0}
            cornerRadius={9}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={animate}
            animationDuration={500}
            animationEasing="ease-out"
          />
          <Tooltip {...TOOLTIP_PROPS} active={tooltipActive} content={<ChartTooltip hideLabel center />} />
        </PieChart>
      </ResponsiveContainer>
      <div className={styles.donutCenter}>
        <strong>{formatCompact(total)}&nbsp;₫</strong>
        <span>{t('dashboard.spent')}</span>
      </div>
    </div>
  );
}

// One capsule, with a small bright dash near its top when there is room: the mark of the Ledgerling charts.
export function Capsule({ x, y, width, height, fill }) {
  if (!height || height <= 0) return null;
  const radius = Math.min(width / 2, 16);
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={radius} ry={radius} fill={fill} />
      {height > radius * 2 + 8 && width > 22 && (
        <rect x={x + width / 2 - 7} y={y + 9} width={14} height={3} rx={1.5} className={styles.capsuleMark} />
      )}
    </g>
  );
}

// Expense of the last months: tall capsules on a track, the amount above each one. The selected month is lit with the aurora.
// data: [{ month: 'YYYY-MM', label: 'Oct', expense }], selected: the 'YYYY-MM' to highlight.
export function MonthlyExpenseChart({ data, selected }) {
  useTheme(); // the colors below are read from the CSS variables, so draw again when the theme changes
  const { t } = useTranslation();
  const animate = !useReducedMotion();
  const biggest = Math.max(...data.map((d) => d.expense), 1);
  const [chartRef, tooltipActive] = useTapAway();

  return (
    <div ref={chartRef} className={styles.barChart} role="img" aria-label={t('dashboard.barLabel')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 22, right: 0, bottom: 0, left: 0 }} barCategoryGap="20%">
          <defs>
            <linearGradient id="dashboard-selected-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cssVar('--chart-highlight-from')} />
              <stop offset="100%" stopColor={cssVar('--chart-highlight-to')} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={10} interval={0} tick={axisTick()} />
          <YAxis hide domain={[0, biggest]} />
          <Tooltip {...TOOLTIP_PROPS} active={tooltipActive} cursor={false} content={<ChartTooltip />} />
          <Bar
            dataKey="expense"
            name={t('common.expense')}
            maxBarSize={64}
            shape={<Capsule />}
            background={{ fill: cssVar('--chart-bar-track'), radius: 16 }}
            isAnimationActive={animate}
            animationDuration={500}
            animationEasing="ease-out"
          >
            {data.map((d) => (
              <Cell key={d.month} fill={d.month === selected ? 'url(#dashboard-selected-fill)' : cssVar('--chart-bar')} />
            ))}
            <LabelList dataKey="expense" position="top" offset={8} formatter={(value) => (value > 0 ? formatCompact(value) : '')} fill={cssVar('--color-text-secondary')} fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
