import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast, { DEFAULT_DURATION } from './Toast.jsx';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

const base = { id: 1, type: 'success', message: 'Transaction deleted' };

describe('Toast', () => {
  it('hides itself after 3 seconds by default', () => {
    const onDismiss = vi.fn();
    render(<Toast toast={base} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(DEFAULT_DURATION - 1);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledWith(1);
  });

  it('can stay longer (the Undo toast lasts 5 seconds)', () => {
    const onDismiss = vi.fn();
    render(<Toast toast={{ ...base, duration: 5000 }} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledWith(1);
  });

  it('shows no action button unless it is given one', () => {
    render(<Toast toast={base} onDismiss={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('runs the action and closes when its button is clicked', async () => {
    const onDismiss = vi.fn();
    const onClick = vi.fn();
    render(<Toast toast={{ ...base, action: { label: 'Undo', onClick } }} onDismiss={onDismiss} />);

    expect(screen.getByText('Transaction deleted')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith(1);
  });
});
