import { describe, expect, it } from 'vitest';
import { tooltipLeft } from './chartTooltip.js';

describe('tooltipLeft', () => {
  it('centres the card on the column under the pointer', () => {
    expect(tooltipLeft(600, 180, 300)).toBe(210);
    expect(tooltipLeft(600, 180, 251)).toBe(161);
  });

  it('never lets the card leave the chart on the left or on the right', () => {
    expect(tooltipLeft(600, 180, 20)).toBe(0);
    expect(tooltipLeft(600, 180, 590)).toBe(420);
  });

  it('centres the card on the chart without an anchor (the donut)', () => {
    expect(tooltipLeft(196, 170)).toBe(13);
    expect(tooltipLeft(196, 170, null)).toBe(13);
  });

  it('centres a card that is wider than the chart', () => {
    expect(tooltipLeft(196, 240, 10)).toBe(-22);
  });
});
