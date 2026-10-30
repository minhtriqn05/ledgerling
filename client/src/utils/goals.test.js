import { describe, expect, it } from 'vitest';
import { daysUntil, formatDaysLeft, monthlySaving } from './goals.js';

// A deadline as the API returns it: noon Vietnam time of the day
const deadline = (day) => `${day}T05:00:00.000Z`;

describe('daysUntil', () => {
  it('counts the days from today to the deadline', () => {
    expect(daysUntil(deadline('2026-11-09'), '2026-10-30')).toBe(10);
  });

  it('is 0 on the deadline day and negative after it', () => {
    expect(daysUntil(deadline('2026-10-30'), '2026-10-30')).toBe(0);
    expect(daysUntil(deadline('2026-10-27'), '2026-10-30')).toBe(-3);
  });

  it('crosses months and years', () => {
    expect(daysUntil(deadline('2027-01-02'), '2026-12-30')).toBe(3);
    expect(daysUntil(deadline('2027-03-01'), '2027-02-01')).toBe(28);
  });
});

describe('formatDaysLeft', () => {
  it('says how long is left', () => {
    expect(formatDaysLeft(152)).toBe('152 days left');
    expect(formatDaysLeft(1)).toBe('1 day left');
  });

  it('says when it is due today or late', () => {
    expect(formatDaysLeft(0)).toBe('Due today');
    expect(formatDaysLeft(-1)).toBe('1 day overdue');
    expect(formatDaysLeft(-3)).toBe('3 days overdue');
  });
});

describe('monthlySaving', () => {
  const goal = (overrides) => ({ remaining: 3000000, completed: false, deadline: deadline('2027-01-28'), ...overrides });

  it('divides what is left by the months left (30 days each, rounded up)', () => {
    // 90 days = 3 months
    expect(monthlySaving(goal(), '2026-10-30')).toBe(1000000);
  });

  it('rounds the months up and the amount up', () => {
    // 91 days -> 4 months -> 750.000
    expect(monthlySaving(goal(), '2026-10-29')).toBe(750000);
    // 1.000.000 / 3 = 333.333,33 -> 333.334
    expect(monthlySaving(goal({ remaining: 1000000 }), '2026-10-30')).toBe(333334);
  });

  it('counts less than a month as one month', () => {
    expect(monthlySaving(goal({ deadline: deadline('2026-11-05') }), '2026-10-30')).toBe(3000000);
    expect(monthlySaving(goal({ deadline: deadline('2026-10-31') }), '2026-10-30')).toBe(3000000);
  });

  it('is null when there is nothing to show', () => {
    expect(monthlySaving(goal({ completed: true, remaining: 0 }), '2026-10-30')).toBeNull();
    expect(monthlySaving(goal({ deadline: null }), '2026-10-30')).toBeNull();
    expect(monthlySaving(goal({ deadline: deadline('2026-10-30') }), '2026-10-30')).toBeNull();
    expect(monthlySaving(goal({ deadline: deadline('2026-10-01') }), '2026-10-30')).toBeNull();
  });
});
