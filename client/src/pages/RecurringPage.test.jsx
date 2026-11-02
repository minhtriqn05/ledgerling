import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RecurringPage from './RecurringPage.jsx';
import { getCategories } from '../api/categories.js';
import { getRecurringRules } from '../api/recurring.js';

const data = vi.hoisted(() => {
  const rule = (id, note) => ({ _id: id, note, amount: 500000, frequency: 'monthly', active: true, nextRunDate: '2026-12-01T05:00:00.000Z' });
  return { RENT: rule('r1', 'Rent'), GYM: rule('r2', 'Gym') };
});

vi.mock('../api/categories.js', () => ({ getCategories: vi.fn() }));
vi.mock('../api/recurring.js', () => ({ getRecurringRules: vi.fn(), toggleRecurringRule: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../context/ToastContext.jsx', () => ({ useToast: () => toast }));
// The page asks for its list again when another device changed something; here the test decides when
const live = vi.hoisted(() => ({}));
vi.mock('../hooks/useLiveRefresh.js', () => ({
  useLiveRefresh: (resources, refetch) => {
    live[[].concat(resources).join(',')] = refetch;
  },
}));
// The rows and the dialogs have their own tests: here a row shows the note and the delete dialog confirms at once
vi.mock('./recurring/RuleRow.jsx', () => ({
  default: ({ rule, onDelete }) => (
    <li>
      <h3>{rule.note}</h3>
      <button onClick={() => onDelete(rule)}>Delete {rule.note}</button>
    </li>
  ),
}));
vi.mock('./recurring/RuleFormDialog.jsx', () => ({ default: () => null }));
vi.mock('./recurring/DeleteRuleDialog.jsx', () => ({
  default: ({ rule, onDeleted }) => <button onClick={() => onDeleted(rule)}>Confirm the delete</button>,
}));

describe('RecurringPage', () => {
  it('a rule deleted while a live refresh was on its way does not come back', async () => {
    getCategories.mockResolvedValue([]);
    getRecurringRules.mockResolvedValueOnce([data.RENT, data.GYM]);
    render(
      <MemoryRouter>
        <RecurringPage />
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: 'Rent' })).toBeInTheDocument();

    // Another device changed something: the list is asked for again, and that answer is slow and still has Rent
    let answerRefresh;
    getRecurringRules.mockReturnValueOnce(new Promise((resolve) => (answerRefresh = resolve)));
    getRecurringRules.mockResolvedValue([data.GYM]);
    act(() => live['recurring,categories']());

    await userEvent.click(screen.getByRole('button', { name: 'Delete Rent' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm the delete' }));
    expect(screen.queryByRole('heading', { name: 'Rent' })).not.toBeInTheDocument();

    await act(async () => answerRefresh([data.RENT, data.GYM]));
    expect(screen.queryByRole('heading', { name: 'Rent' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gym' })).toBeInTheDocument();
  });
});
