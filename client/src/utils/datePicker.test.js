import { describe, expect, it } from 'vitest';
import { addDays, addMonths, clampDay, isOutside, monthDays, weekdayIndex } from './datePicker.js';

describe('datePicker helpers', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // leap year
  });

  it('adds months and keeps the day inside the new month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-03-15', -3)).toBe('2025-12-15');
    expect(addMonths('2026-12-31', 1)).toBe('2027-01-31');
  });

  it('numbers the days of the week from Monday', () => {
    expect(weekdayIndex('2026-10-26')).toBe(0); // Monday
    expect(weekdayIndex('2026-11-01')).toBe(6); // Sunday
  });

  it('builds 6 full weeks that start on a Monday and contain the whole month', () => {
    const days = monthDays('2026-10'); // 1 October 2026 is a Thursday
    expect(days).toHaveLength(42);
    expect(days[0]).toBe('2026-09-28');
    expect(days[3]).toBe('2026-10-01');
    expect(days).toContain('2026-10-31');
    expect(days[41]).toBe('2026-11-08');
  });

  it('checks and clamps a day against optional limits', () => {
    expect(isOutside('2026-10-05', '2026-10-10', '')).toBe(true);
    expect(isOutside('2026-10-15', '2026-10-10', '2026-10-20')).toBe(false);
    expect(isOutside('2026-10-25', undefined, '2026-10-20')).toBe(true);
    expect(clampDay('2026-10-05', '2026-10-10')).toBe('2026-10-10');
    expect(clampDay('2026-10-25', undefined, '2026-10-20')).toBe('2026-10-20');
    expect(clampDay('2026-10-15')).toBe('2026-10-15');
  });
});
