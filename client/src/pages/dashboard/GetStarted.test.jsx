import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GetStarted from './GetStarted.jsx';
import { getBudgets } from '../../api/budgets.js';
import { getGoals } from '../../api/goals.js';

vi.mock('../../api/budgets.js', () => ({ getBudgets: vi.fn() }));
vi.mock('../../api/goals.js', () => ({ getGoals: vi.fn() }));

function renderCard(props) {
  return render(
    <MemoryRouter>
      <GetStarted {...props} />
    </MemoryRouter>
  );
}

const stepFor = (title) => screen.getByRole('link', { name: title }).closest('li');

beforeEach(() => {
  getBudgets.mockReset();
  getGoals.mockReset();
});

describe('GetStarted', () => {
  it('shows the three steps as links to their pages, none done for a new account', async () => {
    getBudgets.mockResolvedValue([]);
    getGoals.mockResolvedValue([]);
    renderCard();

    expect(screen.getByRole('link', { name: 'Add your first transaction' })).toHaveAttribute('href', '/transactions');
    expect(screen.getByRole('link', { name: 'Set a budget' })).toHaveAttribute('href', '/budgets');
    expect(screen.getByRole('link', { name: 'Create a savings goal' })).toHaveAttribute('href', '/goals');
    await waitFor(() => expect(getGoals).toHaveBeenCalled());
    expect(screen.getByText('0 of 3 done')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-done="true"]')).toHaveLength(0);
  });

  it('ticks the budget and goal steps when they exist', async () => {
    getBudgets.mockResolvedValue([{ _id: 'b1' }]);
    getGoals.mockResolvedValue([{ _id: 'g1' }]);
    renderCard();

    await waitFor(() => expect(screen.getByText('2 of 3 done')).toBeInTheDocument());
    expect(stepFor('Set a budget')).toHaveAttribute('data-done', 'true');
    expect(stepFor('Create a savings goal')).toHaveAttribute('data-done', 'true');
    expect(stepFor('Add your first transaction')).toHaveAttribute('data-done', 'false');
    // The tick is also written in words for screen readers
    expect(stepFor('Set a budget')).toHaveTextContent('Done');
    expect(stepFor('Add your first transaction')).toHaveTextContent('To do');
  });

  it('ticks the first step when the Dashboard says there are transactions', async () => {
    getBudgets.mockResolvedValue([]);
    getGoals.mockResolvedValue([]);
    renderCard({ hasTransactions: true });

    expect(screen.getByText('1 of 3 done')).toBeInTheDocument();
    expect(stepFor('Add your first transaction')).toHaveAttribute('data-done', 'true');
    await waitFor(() => expect(getBudgets).toHaveBeenCalled());
  });

  it('leaves a step unticked, without an error, when a request fails', async () => {
    getBudgets.mockRejectedValue(new Error('network'));
    getGoals.mockResolvedValue([{ _id: 'g1' }]);
    renderCard();

    await waitFor(() => expect(screen.getByText('1 of 3 done')).toBeInTheDocument());
    expect(stepFor('Set a budget')).toHaveAttribute('data-done', 'false');
    expect(stepFor('Create a savings goal')).toHaveAttribute('data-done', 'true');
  });
});
