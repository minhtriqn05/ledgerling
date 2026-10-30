import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SavingsGoals from './SavingsGoals.jsx';
import { getGoals } from '../../api/goals.js';

// The real API client sends HTTP requests; here each test decides what the API answers.
vi.mock('../../api/goals.js', () => ({ getGoals: vi.fn() }));

function makeGoal(name, overrides = {}) {
  return {
    _id: name,
    name,
    targetAmount: 1000000,
    savedAmount: 250000,
    deadline: '2099-01-28T05:00:00.000Z',
    color: '#4A9FE3',
    progress: 25,
    remaining: 750000,
    completed: false,
    ...overrides,
  };
}

function renderCard() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<SavingsGoals />} />
        <Route path="/goals" element={<p>Goals page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  getGoals.mockReset();
});

describe('SavingsGoals', () => {
  it('shows the first 2 goals that are not completed, in the order the API sent them', async () => {
    getGoals.mockResolvedValue([
      makeGoal('Trip'),
      makeGoal('Laptop'),
      makeGoal('Bike'),
      makeGoal('Done', { completed: true, progress: 100 }),
    ]);
    renderCard();

    expect(await screen.findByRole('progressbar', { name: 'Trip' })).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByRole('progressbar', { name: 'Laptop' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Bike' })).not.toBeInTheDocument();
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('skips completed goals even when they come first', async () => {
    getGoals.mockResolvedValue([makeGoal('Done', { completed: true, progress: 100 }), makeGoal('Trip')]);
    renderCard();

    expect(await screen.findByRole('progressbar', { name: 'Trip' })).toBeInTheDocument();
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('says when a goal has no deadline', async () => {
    getGoals.mockResolvedValue([makeGoal('Trip', { deadline: null })]);
    renderCard();

    expect(await screen.findByText('No deadline')).toBeInTheDocument();
  });

  it('invites the user to create a first goal', async () => {
    getGoals.mockResolvedValue([]);
    renderCard();

    await userEvent.click(await screen.findByRole('button', { name: 'Create a goal' }));
    expect(screen.getByText('Goals page')).toBeInTheDocument();
  });

  it('says so when every goal is completed', async () => {
    getGoals.mockResolvedValue([makeGoal('Done', { completed: true, progress: 100 })]);
    renderCard();

    expect(await screen.findByText('All goals completed')).toBeInTheDocument();
  });

  it('shows a short message when the goals cannot be loaded', async () => {
    getGoals.mockRejectedValue(new Error('network'));
    renderCard();

    expect(await screen.findByText('Goals could not be loaded.')).toBeInTheDocument();
  });

  it('opens the Goals page from "View all"', async () => {
    getGoals.mockResolvedValue([makeGoal('Trip')]);
    renderCard();

    await userEvent.click(await screen.findByRole('button', { name: 'View all' }));
    expect(screen.getByText('Goals page')).toBeInTheDocument();
  });
});
