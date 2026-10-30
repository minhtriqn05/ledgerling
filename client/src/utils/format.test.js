import { describe, expect, it } from 'vitest';
import {
  formatCompact,
  formatDate,
  formatDateDMY,
  formatDayMonth,
  formatNumber,
  formatSignedVnd,
  formatVnd,
} from './format.js';

// formatVnd puts a non-breaking space (U+00A0) before ₫
const NBSP = ' ';

describe('money', () => {
  it('formats numbers with dots between thousands', () => {
    expect(formatNumber(12450000)).toBe('12.450.000');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
  });

  it('adds the ₫ unit after a non-breaking space', () => {
    expect(formatVnd(12450000)).toBe(`12.450.000${NBSP}₫`);
  });

  it('adds + for income and − for expense', () => {
    expect(formatSignedVnd(18500000, 'income')).toBe(`+18.500.000${NBSP}₫`);
    expect(formatSignedVnd(185000, 'expense')).toBe(`−185.000${NBSP}₫`);
  });

  it('shortens big numbers for chart labels', () => {
    expect(formatCompact(13600000)).toBe('13.6M');
    expect(formatCompact(650000)).toBe('650K');
    expect(formatCompact(0)).toBe('0');
  });
});

describe('dates (shown in Vietnam time)', () => {
  it('formats a day in three styles', () => {
    expect(formatDayMonth('2026-10-25T05:00:00Z')).toBe('25 Oct');
    expect(formatDate('2026-10-25T05:00:00Z')).toBe('25 Oct 2026');
    expect(formatDateDMY('2026-10-25T05:00:00Z')).toBe('25/10/2026');
  });

  it('uses the Vietnam day, not the UTC day', () => {
    // 20:00 UTC on 27 Oct is 03:00 on 28 Oct in Vietnam
    expect(formatDateDMY('2026-10-27T20:00:00Z')).toBe('28/10/2026');
    // 16:30 UTC on 31 Oct is 23:30 on 31 Oct in Vietnam
    expect(formatDate('2026-10-31T16:30:00Z')).toBe('31 Oct 2026');
  });
});
