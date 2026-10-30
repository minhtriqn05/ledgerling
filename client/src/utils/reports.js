// Helpers for the Reports page: how a change is shown, and the month grid of the Calendar tab.
// A month is "YYYY-MM", a day is "YYYY-MM-DD" (Vietnam time, like everything the API sends).

// What the three cards and the category table show under a number.
// percent: the change from last month (null when last month was 0). kind: 'income' | 'expense' | 'balance'.
// direction: 'up' | 'down' | 'flat' | 'none' picks the arrow. tone: 'good' (green) | 'bad' (red) | 'neutral'.
// More income or balance is good, more expense is bad. `label` is the short text next to the arrow ("13.6%", "No data last month")
// and `description` the full sentence for screen readers, so color and arrow are never the only signal.
export function describeChange(percent, kind) {
  if (percent === null || percent === undefined) {
    return { direction: 'none', tone: 'neutral', label: 'No data last month', description: 'No data last month' };
  }
  if (percent === 0) {
    return { direction: 'flat', tone: 'neutral', label: '0%', description: 'No change from last month' };
  }

  const up = percent > 0;
  const good = kind === 'expense' ? !up : up;
  const size = `${Math.abs(percent)}%`;
  return {
    direction: up ? 'up' : 'down',
    tone: good ? 'good' : 'bad',
    label: size,
    description: `${up ? 'Up' : 'Down'} ${size} from last month`,
  };
}

// How dark a calendar cell is: 0 for a day without spending, 1 (lightest) to 4 (darkest) by the share of the busiest day.
export function intensityLevel(total, max) {
  if (total <= 0 || max <= 0) return 0;
  return Math.min(4, Math.ceil((total / max) * 4));
}

// The cells of a month grid whose weeks start on Monday: empty (null) cells before the 1st, then one cell per day.
// The list is padded with nulls to whole weeks, so it always has 28, 35 or 42 cells.
// dailyExpense: [{ date: 'YYYY-MM-DD', total }] for every day of the month, like the monthly report.
// Returns { cells: [null | { date, day, total, level }], max } where max is the biggest day.
export function buildCalendar(month, dailyExpense) {
  const [year, monthNumber] = month.split('-').map(Number);
  // getUTCDay(): 0 = Sunday ... 6 = Saturday. Monday first means Monday = 0 ... Sunday = 6.
  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const max = dailyExpense.reduce((biggest, d) => Math.max(biggest, d.total), 0);

  const cells = [
    ...Array(offset).fill(null),
    ...dailyExpense.map((d) => ({
      date: d.date,
      day: Number(d.date.slice(8, 10)),
      total: d.total,
      level: intensityLevel(d.total, max),
    })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return { cells, max };
}

// The Transactions page showing one day: '/transactions?from=2026-10-10&to=2026-10-10'
export function dayTransactionsPath(day) {
  return `/transactions?from=${day}&to=${day}`;
}

// "2026-10-09" -> "9 October 2026" (the accessible name of a calendar cell)
export function formatLongDay(day) {
  const [year, month, dayNumber] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, dayNumber))
  );
}
