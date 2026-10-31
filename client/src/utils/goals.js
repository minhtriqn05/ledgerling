// Helpers for the savings goals pages. Days are "YYYY-MM-DD" in Vietnam time, like everywhere else.
import i18n from '../i18n/index.js';
import { toDateInput, todayInput } from './vnDate.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-10-30" -> a number of days since 1970 (UTC), so two days can be subtracted
function dayNumber(day) {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date) / DAY_MS;
}

// Whole days from today to the deadline: 0 = due today, negative = the deadline has passed.
// deadline is the ISO date from the API. `today` is only given by tests.
export function daysUntil(deadline, today = todayInput()) {
  return dayNumber(toDateInput(deadline)) - dayNumber(today);
}

// "152 days left", "1 day left", "Due today", "3 days overdue"
export function formatDaysLeft(days) {
  if (days === 0) return i18n.t('goals.dueToday');
  const count = Math.abs(days);
  return i18n.t(days > 0 ? 'goals.daysLeft' : 'goals.daysOverdue', { count });
}

// How much to put aside each month to reach the goal by its deadline (VND, rounded up), or null when the line makes
// no sense: the goal is completed, has no deadline, or the deadline is today or has passed.
// A month counts as 30 days and the time left is rounded up to whole months, never less than 1.
export function monthlySaving(goal, today = todayInput()) {
  if (goal.completed || !goal.deadline) return null;
  const days = daysUntil(goal.deadline, today);
  if (days <= 0) return null;
  return Math.ceil(goal.remaining / Math.max(1, Math.ceil(days / 30)));
}
