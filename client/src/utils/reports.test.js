import { describe, expect, it } from 'vitest';
import { buildCalendar, dayTransactionsPath, describeChange, formatLongDay, intensityLevel, weekdayLabels } from './reports.js';

describe('describeChange', () => {
  it('shows "No data last month" when there is nothing to compare with (null)', () => {
    for (const kind of ['income', 'expense', 'balance']) {
      expect(describeChange(null, kind)).toMatchObject({ direction: 'none', tone: 'neutral', label: 'No data last month' });
    }
  });

  it('more income is good (green), less is bad (red)', () => {
    expect(describeChange(19.4, 'income')).toMatchObject({ direction: 'up', tone: 'good', label: '19.4%' });
    expect(describeChange(-5, 'income')).toMatchObject({ direction: 'down', tone: 'bad', label: '5%' });
  });

  it('more expense is bad (red), less is good (green)', () => {
    expect(describeChange(13.6, 'expense')).toMatchObject({ direction: 'up', tone: 'bad' });
    expect(describeChange(-20, 'expense')).toMatchObject({ direction: 'down', tone: 'good' });
  });

  it('a higher balance is good', () => {
    expect(describeChange(3, 'balance')).toMatchObject({ direction: 'up', tone: 'good' });
    expect(describeChange(-3, 'balance')).toMatchObject({ direction: 'down', tone: 'bad' });
  });

  it('0% is neutral and flat', () => {
    expect(describeChange(0, 'expense')).toMatchObject({ direction: 'flat', tone: 'neutral', label: '0%' });
  });

  it('writes the direction in words for screen readers', () => {
    expect(describeChange(13.6, 'expense').description).toBe('Up 13.6% from last month');
    expect(describeChange(-8, 'income').description).toBe('Down 8% from last month');
  });
});

describe('intensityLevel', () => {
  it('is 0 for a day without spending, and when there is no busiest day', () => {
    expect(intensityLevel(0, 1000)).toBe(0);
    expect(intensityLevel(0, 0)).toBe(0);
  });

  it('goes from 1 (light) to 4 (the busiest day)', () => {
    expect(intensityLevel(1, 1000)).toBe(1);
    expect(intensityLevel(250, 1000)).toBe(1);
    expect(intensityLevel(251, 1000)).toBe(2);
    expect(intensityLevel(500, 1000)).toBe(2);
    expect(intensityLevel(750, 1000)).toBe(3);
    expect(intensityLevel(751, 1000)).toBe(4);
    expect(intensityLevel(1000, 1000)).toBe(4);
  });
});

// All the days of a month with 0 spending, except the ones given
function days(month, count, spent = {}) {
  return Array.from({ length: count }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    return { date, total: spent[date] ?? 0 };
  });
}

describe('buildCalendar', () => {
  it('starts the weeks on Monday: 1 October 2026 is a Thursday, so 3 empty cells come first', () => {
    const { cells } = buildCalendar('2026-10', days('2026-10', 31));

    expect(cells.slice(0, 3)).toEqual([null, null, null]);
    expect(cells[3]).toMatchObject({ date: '2026-10-01', day: 1 });
  });

  it('pads the last week with empty cells (31 days + 3 before = 34, padded to 35)', () => {
    const { cells } = buildCalendar('2026-10', days('2026-10', 31));

    expect(cells).toHaveLength(35);
    expect(cells.at(-1)).toBeNull();
    expect(cells.filter(Boolean)).toHaveLength(31);
  });

  it('has no empty cell when the 1st is a Monday and the month has 28 days (February 2027)', () => {
    const { cells } = buildCalendar('2027-02', days('2027-02', 28));

    expect(cells).toHaveLength(28);
    expect(cells.every(Boolean)).toBe(true);
    expect(cells[0].date).toBe('2027-02-01');
  });

  it('puts a month that starts on a Sunday after 6 empty cells (March 2026)', () => {
    const { cells } = buildCalendar('2026-03', days('2026-03', 31));

    expect(cells.slice(0, 6).every((c) => c === null)).toBe(true);
    expect(cells[6].date).toBe('2026-03-01');
    expect(cells).toHaveLength(42);
  });

  it('shades the days by their share of the busiest day', () => {
    const { cells, max } = buildCalendar(
      '2026-10',
      days('2026-10', 31, { '2026-10-03': 120000, '2026-10-10': 1000000, '2026-10-31': 50000 })
    );
    const byDate = Object.fromEntries(cells.filter(Boolean).map((c) => [c.date, c]));

    expect(max).toBe(1000000);
    expect(byDate['2026-10-10']).toMatchObject({ total: 1000000, level: 4 });
    expect(byDate['2026-10-03']).toMatchObject({ total: 120000, level: 1 });
    expect(byDate['2026-10-31']).toMatchObject({ total: 50000, level: 1 });
    expect(byDate['2026-10-02'].level).toBe(0);
  });

  it('works for a month without any spending', () => {
    const { cells, max } = buildCalendar('2026-10', days('2026-10', 31));

    expect(max).toBe(0);
    expect(cells.filter(Boolean).every((c) => c.level === 0)).toBe(true);
  });
});

describe('buildCalendar when the week starts on Sunday', () => {
  it('puts the 1st of a Thursday month (October 2026) after 4 empty cells', () => {
    const { cells } = buildCalendar('2026-10', days('2026-10', 31), 'sunday');

    expect(cells.slice(0, 4)).toEqual([null, null, null, null]);
    expect(cells[4]).toMatchObject({ date: '2026-10-01', day: 1 });
    expect(cells).toHaveLength(35);
  });

  it('has no empty cell when the 1st is a Sunday (March 2026) and the month fits 5 weeks', () => {
    const { cells } = buildCalendar('2026-03', days('2026-03', 31), 'sunday');

    expect(cells[0]).toMatchObject({ date: '2026-03-01' });
    expect(cells).toHaveLength(35);
  });

  it('puts a month that starts on a Saturday after 6 empty cells (August 2026)', () => {
    const { cells } = buildCalendar('2026-08', days('2026-08', 31), 'sunday');

    expect(cells.slice(0, 6).every((c) => c === null)).toBe(true);
    expect(cells[6].date).toBe('2026-08-01');
  });

  it('still starts on Monday when nothing is said, or for any other value', () => {
    const monday = buildCalendar('2026-10', days('2026-10', 31), 'monday').cells;
    expect(buildCalendar('2026-10', days('2026-10', 31)).cells).toEqual(monday);
    expect(buildCalendar('2026-10', days('2026-10', 31), 'friday').cells).toEqual(monday);
  });
});

describe('weekdayLabels', () => {
  it('starts on Monday by default and on Sunday when asked', () => {
    expect(weekdayLabels()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(weekdayLabels('sunday')).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  });
});

describe('dayTransactionsPath', () => {
  it('filters the Transactions page to exactly one day', () => {
    expect(dayTransactionsPath('2026-10-10')).toBe('/transactions?from=2026-10-10&to=2026-10-10');
  });
});

describe('formatLongDay', () => {
  it('writes the day in full', () => {
    expect(formatLongDay('2026-10-09')).toBe('9 October 2026');
  });
});
