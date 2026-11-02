import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BudgetsPage from './BudgetsPage.jsx';
import { getCategories } from '../api/categories.js';
import { deleteBudget, getBudgets } from '../api/budgets.js';

const data = vi.hoisted(() => {
  const budget = (id, name) => ({
    _id: id,
    category: { _id: `c-${id}`, name, type: 'expense', color: '#FF7043' },
    amount: 1000000,
    spent: 200000,
    remaining: 800000,
    percent: 20,
    status: 'ok',
  });
  return { FOOD: budget('b1', 'Food'), TRAVEL: budget('b2', 'Travel') };
});

vi.mock('../api/categories.js', () => ({ getCategories: vi.fn() }));
vi.mock('../api/budgets.js', () => ({ getBudgets: vi.fn(), copyBudgets: vi.fn(), deleteBudget: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../context/ToastContext.jsx', () => ({ useToast: () => toast }));
// The page asks for its list again when another device changed something; here the test decides when
const live = vi.hoisted(() => ({}));
vi.mock('../hooks/useLiveRefresh.js', () => ({
  useLiveRefresh: (resources, refetch) => {
    live[[].concat(resources).join(',')] = refetch;
  },
}));
// The cards and the dialog have their own tests: here a card shows the category and deletes at once
vi.mock('./budgets/BudgetCard.jsx', () => ({
  default: ({ budget, onDelete }) => (
    <div>
      <h3>{budget.category.name}</h3>
      <button onClick={() => onDelete(budget)}>Delete {budget.category.name}</button>
    </div>
  ),
}));
vi.mock('./budgets/BudgetFormDialog.jsx', () => ({ default: () => null }));

describe('BudgetsPage', () => {
  it('a budget deleted while a live refresh was on its way does not come back', async () => {
    getCategories.mockResolvedValue([]);
    getBudgets.mockResolvedValueOnce([data.FOOD, data.TRAVEL]);
    deleteBudget.mockResolvedValue({});
    render(
      <MemoryRouter>
        <BudgetsPage />
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: 'Food' })).toBeInTheDocument();

    // An expense on another device: the list is asked for again, and that answer is slow and still has Food
    let answerRefresh;
    getBudgets.mockReturnValueOnce(new Promise((resolve) => (answerRefresh = resolve)));
    getBudgets.mockResolvedValue([data.TRAVEL]);
    act(() => live['budgets,transactions']());

    await userEvent.click(screen.getByRole('button', { name: 'Delete Food' }));
    expect(screen.queryByRole('heading', { name: 'Food' })).not.toBeInTheDocument();

    await act(async () => answerRefresh([data.FOOD, data.TRAVEL]));
    expect(screen.queryByRole('heading', { name: 'Food' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Travel' })).toBeInTheDocument();
  });
});
