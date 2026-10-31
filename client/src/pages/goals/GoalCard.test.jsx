import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalCard from './GoalCard.jsx';

// formatVnd puts a non-breaking space (U+00A0) before ₫
const NBSP = ' ';

// A goal as the API returns it. Each test changes only what it needs.
function makeGoal(overrides = {}) {
  return {
    _id: 'g1',
    name: 'New laptop',
    targetAmount: 3000000,
    savedAmount: 1000000,
    deadline: '2027-01-28T05:00:00.000Z',
    color: '#4A9FE3',
    progress: 33.3,
    remaining: 2000000,
    completed: false,
    ...overrides,
  };
}

// today is fixed, so the days left never depend on the date the test runs
function renderCard(goal, handlers = {}) {
  const props = {
    onAddMoney: vi.fn(),
    onWithdraw: vi.fn(),
    onHistory: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    ...handlers,
  };
  render(<GoalCard goal={goal} today="2026-10-30" {...props} />);
  return props;
}

describe('GoalCard', () => {
  it('shows saved / target, the progress bar and what is left', () => {
    renderCard(makeGoal());

    expect(screen.getByText('New laptop')).toBeInTheDocument();
    expect(screen.getByText(`1,000,000${NBSP}₫`)).toBeInTheDocument();
    expect(screen.getByText(`/ 3,000,000${NBSP}₫`)).toBeInTheDocument();
    expect(screen.getByText(`2,000,000${NBSP}₫ to go`)).toBeInTheDocument();
    expect(screen.getByText('33.3%')).toBeInTheDocument();

    const bar = screen.getByRole('progressbar', { name: 'New laptop' });
    expect(bar).toHaveAttribute('aria-valuenow', '33.3');
    expect(bar.firstChild).toHaveStyle({ width: '33.3%' });
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });

  it('shows the deadline, the days left and how much to save each month', () => {
    renderCard(makeGoal());

    expect(screen.getByText('Due 28 Jan 2027')).toBeInTheDocument();
    expect(screen.getByText('90 days left')).toBeInTheDocument();
    // 2,000,000 left, 90 days = 3 months
    expect(screen.getByText(`Save 666,667${NBSP}₫ per month to reach it`)).toBeInTheDocument();
  });

  it('says "Due today" and has no per-month line on the deadline day', () => {
    renderCard(makeGoal({ deadline: '2026-10-30T05:00:00.000Z' }));

    expect(screen.getByText('Due today')).toBeInTheDocument();
    expect(screen.queryByText(/per month/)).not.toBeInTheDocument();
  });

  it('says how late a goal is once its deadline has passed', () => {
    renderCard(makeGoal({ deadline: '2026-10-27T05:00:00.000Z' }));

    expect(screen.getByText('3 days overdue')).toBeInTheDocument();
    expect(screen.queryByText(/per month/)).not.toBeInTheDocument();
  });

  it('has no deadline line and no per-month line without a deadline', () => {
    renderCard(makeGoal({ deadline: null }));

    expect(screen.queryByText(/^Due /)).not.toBeInTheDocument();
    expect(screen.queryByText(/days left/)).not.toBeInTheDocument();
    expect(screen.queryByText(/per month/)).not.toBeInTheDocument();
  });

  it('shows Completed when the goal is reached, with a full bar and no per-month line', () => {
    renderCard(makeGoal({ savedAmount: 3000000, progress: 100, remaining: 0, completed: true }));

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Goal reached')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.queryByText(/to go/)).not.toBeInTheDocument();
    expect(screen.queryByText(/per month/)).not.toBeInTheDocument();
    // The days left no longer matter
    expect(screen.queryByText(/days left/)).not.toBeInTheDocument();
  });

  it('can only withdraw when something is saved', () => {
    renderCard(makeGoal({ savedAmount: 0, progress: 0, remaining: 3000000 }));
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeDisabled();
  });

  it('passes the goal to the add, withdraw, history, edit and delete handlers', async () => {
    const goal = makeGoal();
    const handlers = renderCard(goal);

    await userEvent.click(screen.getByRole('button', { name: 'Add money' }));
    expect(handlers.onAddMoney).toHaveBeenCalledWith(goal);

    await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    expect(handlers.onWithdraw).toHaveBeenCalledWith(goal);

    await userEvent.click(screen.getByRole('button', { name: 'History of New laptop' }));
    expect(handlers.onHistory).toHaveBeenCalledWith(goal);

    await userEvent.click(screen.getByRole('button', { name: 'Edit New laptop' }));
    expect(handlers.onEdit).toHaveBeenCalledWith(goal);

    await userEvent.click(screen.getByRole('button', { name: 'Delete New laptop' }));
    expect(handlers.onDelete).toHaveBeenCalledWith(goal);
  });
});
