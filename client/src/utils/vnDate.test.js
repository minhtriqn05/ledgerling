import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  currentMonth,
  formatMonth,
  formatMonthShort,
  fromDateInput,
  shiftMonth,
  toDateInput,
  todayInput,
} from './vnDate.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('today and this month in Vietnam', () => {
  it('is already the next day in Vietnam at 17:00 UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-31T17:00:00Z')); // 00:00 on 1 Nov in Vietnam
    expect(todayInput()).toBe('2026-11-01');
    expect(currentMonth()).toBe('2026-11');
  });

  it('is still the same day in Vietnam at 16:59 UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-31T16:59:00Z')); // 23:59 on 31 Oct in Vietnam
    expect(todayInput()).toBe('2026-10-31');
    expect(currentMonth()).toBe('2026-10');
  });
});

describe('shiftMonth', () => {
  it('moves across years both ways', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-03', -5)).toBe('2025-10');
    expect(shiftMonth('2026-10', 0)).toBe('2026-10');
  });
});

describe('month labels', () => {
  it('formats a month long and short', () => {
    expect(formatMonth('2026-10')).toBe('October 2026');
    expect(formatMonthShort('2026-01')).toBe('Jan');
  });
});

describe('date inputs', () => {
  it('turns an API date into the Vietnam day for <input type="date">', () => {
    expect(toDateInput('2026-10-27T20:00:00.000Z')).toBe('2026-10-28');
    expect(toDateInput('2026-10-27T05:00:00.000Z')).toBe('2026-10-27');
  });

  it('sends noon Vietnam time so the day can never shift', () => {
    expect(fromDateInput('2026-10-28')).toBe('2026-10-28T12:00:00+07:00');
    // Round trip: the same day comes back
    expect(toDateInput(fromDateInput('2026-10-28'))).toBe('2026-10-28');
  });
});
