import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BudgetCard from './BudgetCard.jsx';

// formatVnd puts a non-breaking space (U+00A0) before ₫
const NBSP = ' ';

// A budget as the API returns it. Each test changes only what it needs.
function makeBudget(overrides = {}) {
  return {
    _id: 'b1',
    category: { _id: 'c1', name: 'Food', color: '#F07D62' },
    month: '2026-10',
    amount: 1000000,
    spent: 500000,
    remaining: 500000,
    percent: 50,
    status: 'ok',
    ...overrides,
  };
}

function renderCard(budget, handlers = {}) {
  return render(<BudgetCard budget={budget} onEdit={handlers.onEdit ?? vi.fn()} onDelete={handlers.onDelete ?? vi.fn()} />);
}

// The progress bar sits directly inside the card, and the card carries the status class
const cardOf = () => screen.getByRole('progressbar').parentElement;

describe('BudgetCard', () => {
  it('shows spent / amount in VND and how much is left', () => {
    renderCard(makeBudget());

    expect(screen.getByText(`500,000${NBSP}₫`)).toBeInTheDocument();
    expect(screen.getByText(`/ 1,000,000${NBSP}₫`)).toBeInTheDocument();
    expect(screen.getByText(`500,000${NBSP}₫ left`)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('is green below 80%', () => {
    renderCard(makeBudget({ status: 'ok' }));
    expect(cardOf()).toHaveClass('ok');
  });

  it('turns yellow from 80%', () => {
    renderCard(makeBudget({ spent: 800000, remaining: 200000, percent: 80, status: 'warning' }));

    expect(cardOf()).toHaveClass('warning');
    expect(screen.getByText(`200,000${NBSP}₫ left`)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80');
  });

  it('turns red at 100% and says "Over by" once the limit is passed', () => {
    renderCard(makeBudget({ spent: 1250000, remaining: -250000, percent: 125, status: 'over' }));

    expect(cardOf()).toHaveClass('over');
    expect(screen.getByText(`Over by 250,000${NBSP}₫`)).toBeInTheDocument();
    // The bar never grows past the card
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('progressbar').firstChild).toHaveStyle({ width: '100%' });
  });

  it('says "0 ₫ left" when the spending is exactly the limit', () => {
    renderCard(makeBudget({ spent: 1000000, remaining: 0, percent: 100, status: 'over' }));
    expect(screen.getByText(`0${NBSP}₫ left`)).toBeInTheDocument();
  });

  it('opens the edit dialog through onEdit', async () => {
    const onEdit = vi.fn();
    const budget = makeBudget();
    renderCard(budget, { onEdit });

    await userEvent.click(screen.getByRole('button', { name: 'Edit the Food budget' }));
    expect(onEdit).toHaveBeenCalledWith(budget);
  });

  it('asks before deleting, and Cancel keeps the budget', async () => {
    const onDelete = vi.fn();
    renderCard(makeBudget(), { onDelete });

    await userEvent.click(screen.getByRole('button', { name: 'Delete the Food budget' }));
    expect(screen.getByText('Delete the "Food" budget?')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('deletes only after the confirmation', async () => {
    const onDelete = vi.fn().mockResolvedValue();
    const budget = makeBudget();
    renderCard(budget, { onDelete });

    await userEvent.click(screen.getByRole('button', { name: 'Delete the Food budget' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(budget);
  });
});
