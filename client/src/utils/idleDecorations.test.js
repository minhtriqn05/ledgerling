import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDLE_AFTER_MS, pauseDecorationsWhenIdle } from './idleDecorations.js';

let stop;
const root = () => document.documentElement;

beforeEach(() => {
  vi.useFakeTimers();
  stop = pauseDecorationsWhenIdle();
});

afterEach(() => {
  stop();
  vi.useRealTimers();
});

describe('pauseDecorationsWhenIdle', () => {
  it('marks the page idle after a while without input', () => {
    vi.advanceTimersByTime(IDLE_AFTER_MS - 1);
    expect(root().hasAttribute('data-idle')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(root().hasAttribute('data-idle')).toBe(true);
  });

  it('wakes up on the next input and waits the whole time again', () => {
    vi.advanceTimersByTime(IDLE_AFTER_MS);
    window.dispatchEvent(new Event('pointermove'));
    expect(root().hasAttribute('data-idle')).toBe(false);
    vi.advanceTimersByTime(IDLE_AFTER_MS - 1);
    expect(root().hasAttribute('data-idle')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(root().hasAttribute('data-idle')).toBe(true);
  });

  it('counts the time from the last input, also with many inputs', () => {
    vi.advanceTimersByTime(IDLE_AFTER_MS / 2);
    window.dispatchEvent(new Event('keydown'));
    vi.advanceTimersByTime(IDLE_AFTER_MS / 2);
    expect(root().hasAttribute('data-idle')).toBe(false);
    document.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(IDLE_AFTER_MS - 1);
    expect(root().hasAttribute('data-idle')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(root().hasAttribute('data-idle')).toBe(true);
  });

  it('can be stopped', () => {
    stop();
    vi.advanceTimersByTime(IDLE_AFTER_MS * 2);
    expect(root().hasAttribute('data-idle')).toBe(false);
    stop = () => {};
  });
});
