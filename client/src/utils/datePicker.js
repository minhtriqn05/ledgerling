// Day arithmetic for the DatePicker. A day is a "YYYY-MM-DD" string and a month a "YYYY-MM" string;
// the math is done in UTC, so no time zone or summer time can shift a day.

function toUtc(day) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}

const toDay = (date) => date.toISOString().slice(0, 10);

// addDays('2026-10-31', 1) -> "2026-11-01"
export function addDays(day, count) {
  const date = toUtc(day);
  date.setUTCDate(date.getUTCDate() + count);
  return toDay(date);
}

// The same day number in another month, kept inside that month: addMonths('2026-01-31', 1) -> "2026-02-28"
export function addMonths(day, count) {
  const [year, month, date] = day.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month - 1 + count + 1, 0)).getUTCDate();
  return toDay(new Date(Date.UTC(year, month - 1 + count, Math.min(date, lastDay))));
}

// Monday = 0 ... Sunday = 6 (weeks start on Monday, like the Reports calendar)
export function weekdayIndex(day) {
  return (toUtc(day).getUTCDay() + 6) % 7;
}

// The 42 days (6 weeks, Monday first) shown for a month, with the end of the previous month and the start of
// the next one around it. Always 6 rows, so the calendar keeps its height from month to month.
export function monthDays(month) {
  const first = `${month}-01`;
  const start = addDays(first, -weekdayIndex(first));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

// True when the day is before min or after max (both optional "YYYY-MM-DD"; strings of this shape sort as dates)
export function isOutside(day, min, max) {
  return Boolean((min && day < min) || (max && day > max));
}

// The day moved inside [min, max]
export function clampDay(day, min, max) {
  if (min && day < min) return min;
  if (max && day > max) return max;
  return day;
}
