import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoadingState, { SLOW_AFTER_MS } from './LoadingState.jsx';

afterEach(() => {
  vi.useRealTimers();
});

describe('LoadingState', () => {
  it('says "Loading…" by default', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('says the slow text after a few seconds, so a long wait does not look stuck', () => {
    vi.useFakeTimers();
    render(<LoadingState fullScreen slowText="Starting the server…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    act(() => vi.advanceTimersByTime(SLOW_AFTER_MS - 1));
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('status')).toHaveTextContent('Starting the server…');
  });

  it('keeps its text without slowText', () => {
    vi.useFakeTimers();
    render(<LoadingState>Loading the report…</LoadingState>);
    act(() => vi.advanceTimersByTime(SLOW_AFTER_MS * 2));
    expect(screen.getByRole('status')).toHaveTextContent('Loading the report…');
  });
});
