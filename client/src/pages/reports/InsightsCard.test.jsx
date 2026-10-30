import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import InsightsCard from './InsightsCard.jsx';
import { getInsights } from '../../api/reports.js';

// The real API client sends HTTP requests; here each test decides what the API answers.
vi.mock('../../api/reports.js', () => ({ getInsights: vi.fn() }));

function renderCard(month = '2026-10') {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<InsightsCard month={month} />} />
        <Route path="/transactions" element={<p>Transactions page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  getInsights.mockReset();
});

describe('InsightsCard', () => {
  it('asks for the insights of the month and shows loading first', async () => {
    getInsights.mockResolvedValue({ month: '2026-10', insights: [] });
    renderCard('2026-10');

    expect(screen.getByText('Loading insights…')).toBeInTheDocument();
    await screen.findByText(/No insights for October 2026 yet/);
    expect(getInsights).toHaveBeenCalledWith('2026-10');
  });

  it('lists each insight as a link with its severity in words', async () => {
    getInsights.mockResolvedValue({
      month: '2026-10',
      insights: [
        {
          type: 'category-up',
          severity: 'warning',
          message: 'You spent 200.000 ₫ (25%) more on Bills than last month.',
          link: '/transactions?month=2026-10',
        },
        { type: 'savings-rate', severity: 'success', message: 'Great! You saved 94% of your income.', link: '/reports' },
      ],
    });
    renderCard();

    const warning = await screen.findByRole('link', { name: /You spent 200\.000/ });
    expect(warning).toHaveAttribute('href', '/transactions?month=2026-10');
    // The severity is written out for screen readers, so the color is never the only signal
    expect(warning).toHaveTextContent('Warning: You spent 200.000');
    expect(screen.getByRole('link', { name: /Great! You saved 94%/ })).toHaveTextContent('Good news: Great! You saved 94%');
  });

  it('opens the page of an insight when it is clicked', async () => {
    getInsights.mockResolvedValue({
      month: '2026-10',
      insights: [{ type: 'largest-expense', severity: 'info', message: 'Your largest expense was big.', link: '/transactions?from=2026-10-10&to=2026-10-10' }],
    });
    renderCard();

    await userEvent.click(await screen.findByRole('link', { name: /Your largest expense/ }));

    expect(screen.getByText('Transactions page')).toBeInTheDocument();
  });

  it('shows a message and a retry button when the request fails', async () => {
    getInsights.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ month: '2026-10', insights: [] });
    renderCard();

    expect(await screen.findByText('Insights could not be loaded.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText(/No insights for October 2026 yet/)).toBeInTheDocument();
    expect(getInsights).toHaveBeenCalledTimes(2);
  });
});
