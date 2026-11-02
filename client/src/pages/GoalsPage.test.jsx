import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import GoalsPage from './GoalsPage.jsx';
import { getGoals } from '../api/goals.js';

const data = vi.hoisted(() => {
  const goal = (id, name) => ({ _id: id, name, targetAmount: 5000000, savedAmount: 0, progress: 0, remaining: 5000000, completed: false, deadline: null, color: '#4A9FE3' });
  return { TRIP: goal('g1', 'Trip'), BIKE: goal('g2', 'Bike') };
});

vi.mock('../api/goals.js', () => ({ getGoals: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../context/ToastContext.jsx', () => ({ useToast: () => toast }));
// The page asks for its list again when another device changed something; here the test decides when
const live = vi.hoisted(() => ({}));
vi.mock('../hooks/useLiveRefresh.js', () => ({
  useLiveRefresh: (resources, refetch) => {
    live[[].concat(resources).join(',')] = refetch;
  },
}));
// The cards and the dialogs have their own tests: here a card shows the name and the form saves Bike at once
vi.mock('./goals/GoalCard.jsx', () => ({ default: ({ goal }) => <h3>{goal.name}</h3> }));
vi.mock('./goals/GoalFormDialog.jsx', () => ({
  default: ({ onSaved }) => <button onClick={() => onSaved(data.BIKE)}>Save the form</button>,
}));
vi.mock('./goals/MoneyDialog.jsx', () => ({ default: () => null }));
vi.mock('./goals/HistoryDialog.jsx', () => ({ default: () => null }));
vi.mock('./goals/DeleteGoalDialog.jsx', () => ({ default: () => null }));

describe('GoalsPage', () => {
  it('keeps a goal saved while a live refresh was on its way', async () => {
    getGoals.mockResolvedValueOnce([data.TRIP]);
    render(
      <MemoryRouter>
        <GoalsPage />
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: 'Trip' })).toBeInTheDocument();

    // Another device changed something: the list is asked for again, and that answer is slow and has no Bike
    let answerRefresh;
    getGoals.mockReturnValueOnce(new Promise((resolve) => (answerRefresh = resolve)));
    getGoals.mockResolvedValue([data.BIKE, data.TRIP]);
    act(() => live.goals());

    await userEvent.click(screen.getByRole('button', { name: 'New goal' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save the form' }));
    expect(await screen.findByRole('heading', { name: 'Bike' })).toBeInTheDocument();

    await act(async () => answerRefresh([data.TRIP]));
    expect(screen.getByRole('heading', { name: 'Bike' })).toBeInTheDocument();
  });
});
