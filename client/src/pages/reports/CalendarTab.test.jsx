import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import CalendarTab from './CalendarTab.jsx';
import { getMonthlyReport } from '../../api/reports.js';

vi.mock('../../api/reports.js', () => ({ getMonthlyReport: vi.fn() }));

// October 2026: 31 days, 10 Oct has 1,000,000 ₫, 3 Oct has 120,000 ₫
function makeReport() {
  const dailyExpense = Array.from({ length: 31 }, (_, i) => {
    const date = `2026-10-${String(i + 1).padStart(2, '0')}`;
    return { date, total: { '2026-10-10': 1000000, '2026-10-03': 120000 }[date] ?? 0 };
  });
  return { month: '2026-10', totals: { income: 0, expense: 1120000, balance: -1120000 }, dailyExpense };
}

// Shows where the app navigated to, so a test can check the filtered Transactions address
function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderTab() {
  return render(
    <MemoryRouter initialEntries={['/reports']}>
      <Routes>
        <Route path="/reports" element={<CalendarTab month="2026-10" />} />
        <Route path="/transactions" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  getMonthlyReport.mockReset();
});

describe('CalendarTab', () => {
  it('shows a button for every day of the month, with its spending in the name', async () => {
    getMonthlyReport.mockResolvedValue(makeReport());
    renderTab();

    expect(await screen.findByRole('button', { name: '10 October 2026: spent 1,000,000 ₫' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 October 2026: no spending' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(31);
    expect(getMonthlyReport).toHaveBeenCalledWith('2026-10');
  });

  it('starts the week on Monday', async () => {
    getMonthlyReport.mockResolvedValue(makeReport());
    renderTab();
    await screen.findByRole('button', { name: /10 October 2026/ });

    const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => screen.getByText(d));
    // The order in the page is the order of the columns
    names.slice(1).forEach((name, i) => {
      expect(names[i].compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('shades a day more the more was spent on it', async () => {
    getMonthlyReport.mockResolvedValue(makeReport());
    renderTab();

    const busiest = await screen.findByRole('button', { name: /^10 October 2026/ });
    const light = screen.getByRole('button', { name: /^3 October 2026/ });
    const none = screen.getByRole('button', { name: /^1 October 2026/ });

    expect(busiest.className).toMatch(/level4/);
    expect(light.className).toMatch(/level1/);
    expect(none.className).toMatch(/level0/);
  });

  it('opens the Transactions page filtered to exactly the clicked day', async () => {
    getMonthlyReport.mockResolvedValue(makeReport());
    renderTab();

    await userEvent.click(await screen.findByRole('button', { name: /10 October 2026/ }));

    expect(screen.getByTestId('where')).toHaveTextContent('/transactions?from=2026-10-10&to=2026-10-10');
  });

  it('shows an error with a retry button', async () => {
    getMonthlyReport.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(makeReport());
    renderTab();

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('button', { name: /10 October 2026/ })).toBeInTheDocument();
  });
});
