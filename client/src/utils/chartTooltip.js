// Where the tooltip card of a chart goes, across (pages/dashboard/DashboardCharts.jsx, ChartTooltip).
// frameWidth: the width of the chart. cardWidth: the width of the card. anchorX: the middle of the column (or the day)
// under the pointer, in pixels from the left of the chart; null for the middle of the chart (the donut).
// Returns the left edge of the card inside the chart: centred on the anchor, but never past the left or right edge of
// the chart. A card wider than the chart is centred on the chart.
export function tooltipLeft(frameWidth, cardWidth, anchorX = null) {
  if (cardWidth >= frameWidth) return Math.round((frameWidth - cardWidth) / 2);
  const x = anchorX ?? frameWidth / 2;
  return Math.round(Math.min(Math.max(x - cardWidth / 2, 0), frameWidth - cardWidth));
}
