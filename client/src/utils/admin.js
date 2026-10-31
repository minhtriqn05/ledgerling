import { formatDate, formatDayMonth } from './format.js';

// Helpers of the Admin page.

// The API sends [{ date: '2026-10-31', count: 3 }]; the charts want a short label for the axis and a long one for the tooltip.
export function toChartData(series) {
  return series.map(({ date, count }) => ({ date, label: formatDayMonth(date), fullLabel: formatDate(date), count }));
}

// Axis steps for a chart of counts: whole numbers only (1, 2, 5, 10, 20, 50...), at least up to 4 so a tiny maximum
// does not give steps like 0.8. countTicks(3) -> [0, 1, 2, 3, 4], countTicks(230) -> [0, 100, 200, 300]
export function countTicks(max) {
  const top = Math.max(Math.ceil(max), 4);
  const rawStep = top / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep);
  return Array.from({ length: Math.ceil(top / step) + 1 }, (_, i) => i * step);
}

// Disable / Enable is offered for a normal user who is not you. The API refuses the other cases (403) anyway;
// the button is hidden so nobody has to press it to find out.
export function canChangeStatus(user, currentUserId) {
  return user.role !== 'admin' && user._id !== currentUserId;
}

// The status the Disable / Enable button leads to
export function nextStatus(user) {
  return user.status === 'disabled' ? 'active' : 'disabled';
}
