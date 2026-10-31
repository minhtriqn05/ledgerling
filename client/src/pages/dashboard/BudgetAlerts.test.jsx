import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BudgetAlerts from './BudgetAlerts.jsx';
import { getBudgets } from '../../api/budgets.js';

// The real API client sends HTTP requests; here each test decides what the API answers.
vi.mock('../../api/budgets.js', () => ({ getBudgets: vi.fn() }));

// formatVnd puts a non-breaking space (U+00A0) before ₫
const NBSP = ' ';

function makeBudget(name, overrides = {}) {
  return {
    _id: name,
    category: { _id: `c-${name}`, name, color: '#F07D62' },
    month: '2026-10',
    amount: 1000000,
    spent: 100000,
    remaining: 900000,
    percent: 10,
    status: 'ok',
    ...overrides,
  };
}

function renderCard(month = '2026-10') {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<BudgetAlerts month={month} />} />
        <Route path="/budgets" element={<p>Budgets page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  getBudgets.mockReset();
});

describe('BudgetAlerts', () => {
  it('asks the API for the month on screen', async () => {
    getBudgets.mockResolvedValue([]);
    renderCard('2026-09');

    await screen.findByText(/No budgets in September 2026/);
    expect(getBudgets).toHaveBeenCalledWith('2026-09');
  });

  it('lists the warning and over budgets, the fullest first, and hides the ones that are fine', async () => {
    getBudgets.mockResolvedValue([
      makeBudget('Bills', { spent: 850000, remaining: 150000, percent: 85, status: 'warning' }),
      makeBudget('Coffee', { status: 'ok' }),
      makeBudget('Food', { spent: 1200000, remaining: -200000, percent: 120, status: 'over' }),
    ]);
    renderCard();

    expect(await screen.findByText(`Over by 200,000${NBSP}₫`)).toBeInTheDocument();
    expect(screen.getByText(`150,000${NBSP}₫ left`)).toBeInTheDocument();
    expect(screen.queryByText('Coffee')).not.toBeInTheDocument();
    expect(screen.queryByText('All budgets on track')).not.toBeInTheDocument();

    const names = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(names[0]).toContain('Food'); // 120% first
    expect(names[1]).toContain('Bills'); // then 85%
  });

  it('says "Limit reached" for a budget spent exactly to its limit', async () => {
    getBudgets.mockResolvedValue([makeBudget('Food', { spent: 1000000, remaining: 0, percent: 100, status: 'over' })]);
    renderCard();

    expect(await screen.findByText('Limit reached')).toBeInTheDocument();
  });

  it('says "All budgets on track" when every budget is below 80%', async () => {
    getBudgets.mockResolvedValue([makeBudget('Food'), makeBudget('Bills')]);
    renderCard();

    expect(await screen.findByText('All budgets on track')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('invites the user to create a budget when the month has none', async () => {
    getBudgets.mockResolvedValue([]);
    renderCard();

    expect(await screen.findByText(/No budgets in October 2026 yet/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create a budget' }));
    expect(screen.getByText('Budgets page')).toBeInTheDocument();
  });

  it('has a "Manage budgets" button that opens the Budgets page', async () => {
    getBudgets.mockResolvedValue([makeBudget('Food')]);
    renderCard();

    await screen.findByText('All budgets on track');
    await userEvent.click(screen.getByRole('button', { name: 'Manage budgets' }));
    expect(screen.getByText('Budgets page')).toBeInTheDocument();
  });

  it('shows a short message, not a crash, when the budgets cannot be loaded', async () => {
    getBudgets.mockRejectedValue(new Error('Network Error'));
    renderCard();

    expect(await screen.findByText('Budgets could not be loaded.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage budgets' })).toBeInTheDocument();
  });

  it('shows a loading line until the API answers', async () => {
    let answer;
    getBudgets.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    renderCard();

    expect(screen.getByText('Loading budgets…')).toBeInTheDocument();
    answer([]);
    expect(await screen.findByText(/No budgets in October 2026 yet/)).toBeInTheDocument();
  });
});
