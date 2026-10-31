import { formatDayMonth, formatPercent, formatVnd } from './format.js';
import { formatMonth } from './vnDate.js';

// What the bell and the Notifications page need to know about a notification.

// The icon (components/Icon.jsx) and accent color (--accent-<tone> in tokens.css) of each type
export const NOTIFICATION_STYLE = {
  budget_warning: { icon: 'wallet', tone: 'sun' },
  budget_over: { icon: 'alert', tone: 'coral' },
  goal_completed: { icon: 'target', tone: 'mint' },
  recurring_created: { icon: 'repeat', tone: 'sky' },
  weekly_summary: { icon: 'reports', tone: 'periwinkle' },
};
const FALLBACK_STYLE = { icon: 'bell', tone: 'sky' };

export function styleOf(type) {
  return NOTIFICATION_STYLE[type] ?? FALLBACK_STYLE;
}

// The switches of Notification settings, in the order they are shown. Each one turns off the types listed here.
export const NOTIFICATION_SWITCHES = [
  { key: 'budget', icon: 'wallet', types: ['budget_warning', 'budget_over'] },
  { key: 'goals', icon: 'target', types: ['goal_completed'] },
  { key: 'recurring', icon: 'repeat', types: ['recurring_created'] },
  { key: 'weekly', icon: 'reports', types: ['weekly_summary'] },
];

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// How old a moment is: { unit: 'now' } under a minute, then minutes, hours and days (up to 6), then { unit: 'date' }.
// `now` is a parameter so tests can pick the time.
export function ageOf(date, now = Date.now()) {
  // A clock that is a little behind the server would give a negative age: count it as "just now"
  const age = Math.max(0, now - new Date(date).getTime());
  if (age < MINUTE) return { unit: 'now' };
  if (age < HOUR) return { unit: 'minutes', count: Math.floor(age / MINUTE) };
  if (age < DAY) return { unit: 'hours', count: Math.floor(age / HOUR) };
  if (age < 7 * DAY) return { unit: 'days', count: Math.floor(age / DAY) };
  return { unit: 'date' };
}

// "Just now", "5m ago", "2h ago", "3d ago", and from a week on the date ("25 Oct")
export function formatAge(date, t, now = Date.now()) {
  const age = ageOf(date, now);
  if (age.unit === 'now') return t('notifications.time.now');
  if (age.unit === 'date') return formatDayMonth(date);
  return t(`notifications.time.${age.unit}`, { count: age.count });
}

// The title and message in the user's language, built from the type and the numbers in `params`.
// A type or params this version does not know shows the English text the API stored.
export function notificationText(notification, t) {
  const { type, params = {} } = notification;
  const fallback = { title: notification.title, message: notification.message };
  const key = `notifications.types.${type}`;

  switch (type) {
    case 'budget_warning':
    case 'budget_over': {
      if (params.categoryName == null || params.month == null) return fallback;
      const values = {
        category: params.categoryName,
        month: formatMonth(params.month),
        percent: formatPercent(params.percent),
        spent: formatVnd(params.spent),
        amount: formatVnd(params.amount),
      };
      return { title: t(`${key}.title`, values), message: t(`${key}.message`, values) };
    }
    case 'goal_completed': {
      if (params.goalName == null) return fallback;
      const values = { goal: params.goalName, target: formatVnd(params.targetAmount) };
      return { title: t(`${key}.title`, values), message: t(`${key}.message`, values) };
    }
    case 'recurring_created': {
      if (params.count == null) return fallback;
      return { title: t(`${key}.title`), message: t(`${key}.message`, { count: params.count }) };
    }
    case 'weekly_summary': {
      if (params.count == null) return fallback;
      const title = t(`${key}.title`);
      if (params.count === 0) return { title, message: t(`${key}.messageEmpty`) };
      const values = {
        total: formatVnd(params.total),
        count: params.count,
        category: params.topCategory ?? '',
      };
      return { title, message: t(`${key}.message`, values) };
    }
    default:
      return fallback;
  }
}
