import { describe, expect, it } from 'vitest';
import { canChangeStatus, countTicks, nextStatus, toChartData } from './admin.js';

describe('toChartData', () => {
  it('keeps the count and adds a short and a long label', () => {
    const data = toChartData([
      { date: '2026-10-30', count: 0 },
      { date: '2026-10-31', count: 5 },
    ]);
    expect(data).toHaveLength(2);
    expect(data[1]).toMatchObject({ date: '2026-10-31', count: 5 });
    expect(data[1].label).toMatch(/31/);
    expect(data[1].fullLabel).toMatch(/2026/);
    expect(data[0].count).toBe(0);
  });

  it('answers an empty list for an empty series', () => {
    expect(toChartData([])).toEqual([]);
  });
});

describe('countTicks', () => {
  it('uses whole steps, also for a tiny maximum', () => {
    expect(countTicks(0)).toEqual([0, 1, 2, 3, 4]);
    expect(countTicks(3)).toEqual([0, 1, 2, 3, 4]);
  });

  it('rounds the step to 1, 2, 5 or 10 times a power of ten and covers the maximum', () => {
    expect(countTicks(10)).toEqual([0, 5, 10]);
    expect(countTicks(230)).toEqual([0, 100, 200, 300]);
    for (const max of [7, 13, 99, 1234]) {
      const ticks = countTicks(max);
      expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(max);
      expect(ticks.every(Number.isInteger)).toBe(true);
    }
  });
});

describe('canChangeStatus', () => {
  const me = 'a1';

  it('allows a normal user who is not me', () => {
    expect(canChangeStatus({ _id: 'u2', role: 'user', status: 'active' }, me)).toBe(true);
    expect(canChangeStatus({ _id: 'u3', role: 'user', status: 'disabled' }, me)).toBe(true);
  });

  it('refuses me and every admin', () => {
    expect(canChangeStatus({ _id: me, role: 'admin', status: 'active' }, me)).toBe(false);
    expect(canChangeStatus({ _id: 'a2', role: 'admin', status: 'active' }, me)).toBe(false);
  });
});

describe('nextStatus', () => {
  it('flips the status', () => {
    expect(nextStatus({ status: 'active' })).toBe('disabled');
    expect(nextStatus({ status: 'disabled' })).toBe('active');
  });
});
