import { currentLocale } from './format.js';

// Month and date helpers in Vietnam time (UTC+7), the time zone the API uses for its "month" filter.
// A month is a "YYYY-MM" string, a day for <input type="date"> is "YYYY-MM-DD".

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

// The "en-CA" locale writes dates as YYYY-MM-DD.
const dayParts = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TIME_ZONE,
});

// These three follow the user's language. The months are built in UTC, so no time zone can shift them.
const monthLabel = (options) => new Intl.DateTimeFormat(currentLocale(), { ...options, timeZone: 'UTC' });
function firstOfMonth(month) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1, 1));
}

// Today in Vietnam: "2026-10-28"
export function todayInput() {
  return dayParts.format(new Date());
}

// This month in Vietnam: "2026-10"
export function currentMonth() {
  return todayInput().slice(0, 7);
}

// shiftMonth('2026-12', 1) -> "2027-01"
export function shiftMonth(month, delta) {
  const [year, number] = month.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, number - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
}

// "2026-10" -> "October 2026"
export function formatMonth(month) {
  return monthLabel({ month: 'long', year: 'numeric' }).format(firstOfMonth(month));
}

// "2026-10" -> "October" (a month inside a year that is already on screen)
export function formatMonthName(month) {
  return monthLabel({ month: 'long' }).format(firstOfMonth(month));
}

// "2026-10" -> "Oct" (chart axis labels)
export function formatMonthShort(month) {
  return monthLabel({ month: 'short' }).format(firstOfMonth(month));
}

// An ISO date from the API -> the Vietnam day for an <input type="date">: "2026-10-27T20:00:00.000Z" -> "2026-10-28"
export function toDateInput(date) {
  return dayParts.format(new Date(date));
}

// A day from an <input type="date"> -> the ISO 8601 text the API expects (noon in Vietnam, so the day cannot shift).
export function fromDateInput(day) {
  return `${day}T12:00:00+07:00`;
}
