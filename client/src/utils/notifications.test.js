import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../i18n/index.js';
import { NOTIFICATION_STYLE, NOTIFICATION_SWITCHES, ageOf, formatAge, notificationText, styleOf } from './notifications.js';

const NOW = new Date('2026-10-31T10:00:00.000Z').getTime();
const ago = (ms) => new Date(NOW - ms).toISOString();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

afterEach(() => i18n.changeLanguage('en'));

describe('ageOf', () => {
  it('is "now" under a minute, even for a time a little in the future', () => {
    expect(ageOf(ago(0), NOW)).toEqual({ unit: 'now' });
    expect(ageOf(ago(59 * 1000), NOW)).toEqual({ unit: 'now' });
    expect(ageOf(ago(-30 * 1000), NOW)).toEqual({ unit: 'now' });
  });

  it('counts whole minutes, hours and days, rounding down', () => {
    expect(ageOf(ago(MINUTE), NOW)).toEqual({ unit: 'minutes', count: 1 });
    expect(ageOf(ago(59 * MINUTE + 59 * 1000), NOW)).toEqual({ unit: 'minutes', count: 59 });
    expect(ageOf(ago(HOUR), NOW)).toEqual({ unit: 'hours', count: 1 });
    expect(ageOf(ago(2 * HOUR + 30 * MINUTE), NOW)).toEqual({ unit: 'hours', count: 2 });
    expect(ageOf(ago(DAY), NOW)).toEqual({ unit: 'days', count: 1 });
    expect(ageOf(ago(6 * DAY + 23 * HOUR), NOW)).toEqual({ unit: 'days', count: 6 });
  });

  it('switches to the date from 7 days on', () => {
    expect(ageOf(ago(7 * DAY), NOW)).toEqual({ unit: 'date' });
    expect(ageOf(ago(40 * DAY), NOW)).toEqual({ unit: 'date' });
  });
});

describe('formatAge', () => {
  it('writes "2h ago" and its relatives in English', () => {
    expect(formatAge(ago(10 * 1000), i18n.t, NOW)).toBe('Just now');
    expect(formatAge(ago(5 * MINUTE), i18n.t, NOW)).toBe('5m ago');
    expect(formatAge(ago(2 * HOUR), i18n.t, NOW)).toBe('2h ago');
    expect(formatAge(ago(3 * DAY), i18n.t, NOW)).toBe('3d ago');
  });

  it('shows the day and month after a week', () => {
    expect(formatAge('2026-10-20T05:00:00.000Z', i18n.t, NOW)).toBe('20 Oct');
  });

  it('follows the language', async () => {
    await i18n.changeLanguage('vi');
    expect(formatAge(ago(2 * HOUR), i18n.t, NOW)).toBe('2 giờ trước');
  });
});

describe('notificationText', () => {
  const t = (...args) => i18n.t(...args);

  it('builds a budget warning from its numbers', () => {
    const text = notificationText(
      {
        type: 'budget_warning',
        title: 'stored title',
        message: 'stored message',
        params: { categoryName: 'Food', month: '2026-10', percent: 85, spent: 850000, amount: 1000000 },
      },
      t
    );
    expect(text.title).toBe('Budget warning: Food');
    expect(text.message).toBe('Food has used 85% of its October 2026 budget (850,000 ₫ of 1,000,000 ₫).');
  });

  it('builds an over-budget alert', () => {
    const text = notificationText(
      {
        type: 'budget_over',
        params: { categoryName: 'Food', month: '2026-10', percent: 105, spent: 1050000, amount: 1000000 },
      },
      t
    );
    expect(text.title).toBe('Over budget: Food');
    expect(text.message).toContain('1,050,000 ₫ spent of 1,000,000 ₫');
  });

  it('builds a reached goal', () => {
    const text = notificationText({ type: 'goal_completed', params: { goalName: 'Trip', targetAmount: 5000000 } }, t);
    expect(text.title).toBe('Goal reached: Trip');
    expect(text.message).toBe('You saved 5,000,000 ₫ for "Trip". Well done!');
  });

  it('uses the singular and the plural for recurring transactions', () => {
    const one = notificationText({ type: 'recurring_created', params: { count: 1 } }, t);
    const many = notificationText({ type: 'recurring_created', params: { count: 3 } }, t);
    expect(one.message).toBe('1 recurring transaction was added.');
    expect(many.message).toBe('3 recurring transactions were added.');
  });

  it('builds the weekly summary, with a text of its own when nothing was spent', () => {
    const spent = notificationText(
      { type: 'weekly_summary', params: { total: 250000, count: 2, topCategory: 'Food', from: '2026-10-25', to: '2026-10-31' } },
      t
    );
    expect(spent.title).toBe('Your week in numbers');
    expect(spent.message).toBe('You spent 250,000 ₫ in 2 transactions in the last 7 days. Top category: Food.');

    const none = notificationText({ type: 'weekly_summary', params: { total: 0, count: 0, topCategory: null } }, t);
    expect(none.message).toBe('You did not spend anything in the last 7 days.');
  });

  it('writes the text in the language of the user', async () => {
    await i18n.changeLanguage('vi');
    const text = notificationText({ type: 'goal_completed', params: { goalName: 'Du lịch', targetAmount: 5000000 } }, t);
    expect(text.title).toBe('Đã đạt mục tiêu: Du lịch');
  });

  it('shows the stored English text for a type or params it does not know', () => {
    const stored = { title: 'Stored title', message: 'Stored message' };
    expect(notificationText({ type: 'something_new', params: {}, ...stored }, t)).toEqual(stored);
    expect(notificationText({ type: 'budget_over', params: {}, ...stored }, t)).toEqual(stored);
    expect(notificationText({ type: 'goal_completed', ...stored }, t)).toEqual(stored);
  });
});

describe('styles and switches', () => {
  it('has an icon and a tone for every type, and a bell for an unknown one', () => {
    for (const type of ['budget_warning', 'budget_over', 'goal_completed', 'recurring_created', 'weekly_summary']) {
      expect(NOTIFICATION_STYLE[type]).toBeDefined();
    }
    expect(styleOf('something_new')).toEqual({ icon: 'bell', tone: 'sky' });
  });

  it('has one switch for each of the four preference keys, and every type belongs to exactly one', () => {
    expect(NOTIFICATION_SWITCHES.map((s) => s.key)).toEqual(['budget', 'goals', 'recurring', 'weekly']);
    const types = NOTIFICATION_SWITCHES.flatMap((s) => s.types).sort();
    expect(types).toEqual(Object.keys(NOTIFICATION_STYLE).sort());
  });
});
