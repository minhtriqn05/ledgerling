import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ReportsPage from './ReportsPage.jsx';

// The three tabs are tested on their own; here they are stubs that show what they were given
vi.mock('./reports/MonthlyTab.jsx', () => ({ default: ({ month }) => <p>Monthly tab for {month}</p> }));
vi.mock('./reports/YearlyTab.jsx', () => ({ default: ({ year }) => <p>Yearly tab for {year}</p> }));
vi.mock('./reports/CalendarTab.jsx', () => ({ default: ({ month }) => <p>Calendar tab for {month}</p> }));

function Where() {
  const { search } = useLocation();
  return <p data-testid="search">{search}</p>;
}

function renderPage(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ReportsPage />
      <Where />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ReportsPage', () => {
  it('opens the Monthly tab of the month in the address', () => {
    renderPage('/reports?month=2026-03');

    expect(screen.getByRole('tab', { name: 'Monthly' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Monthly tab for 2026-03')).toBeInTheDocument();
  });

  it('opens the tab named in the address', () => {
    renderPage('/reports?tab=calendar&month=2026-03');

    expect(screen.getByRole('tab', { name: 'Calendar' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Calendar tab for 2026-03')).toBeInTheDocument();
  });

  it('switches between the three tabs and keeps the address in step', async () => {
    renderPage('/reports?month=2026-03');

    await userEvent.click(screen.getByRole('tab', { name: 'Yearly' }));
    // The Yearly tab starts with the year of the chosen month
    expect(screen.getByText('Yearly tab for 2026')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('?tab=yearly&month=2026-03&year=2026');

    await userEvent.click(screen.getByRole('tab', { name: 'Calendar' }));
    expect(screen.getByText('Calendar tab for 2026-03')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('?tab=calendar&month=2026-03');

    await userEvent.click(screen.getByRole('tab', { name: 'Monthly' }));
    expect(screen.getByText('Monthly tab for 2026-03')).toBeInTheDocument();
  });

  it('moves between the tabs with the arrow keys', async () => {
    renderPage('/reports?month=2026-03');

    screen.getByRole('tab', { name: 'Monthly' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Yearly' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Yearly' })).toHaveFocus();
  });

  it('changes the month with the arrows of the picker', async () => {
    renderPage('/reports?month=2026-03');

    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));

    expect(screen.getByText('Monthly tab for 2026-02')).toBeInTheDocument();
  });

  it('changes the year with the arrows of the year picker', async () => {
    renderPage('/reports?tab=yearly&year=2026');

    await userEvent.click(screen.getByRole('button', { name: 'Next year' }));

    expect(screen.getByText('Yearly tab for 2027')).toBeInTheDocument();
  });

  it('falls back to the Monthly tab when the address is nonsense', () => {
    renderPage('/reports?tab=nonsense&month=banana&year=12');

    expect(screen.getByRole('tab', { name: 'Monthly' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/^Monthly tab for \d{4}-\d{2}$/)).toBeInTheDocument();
  });

  it('prints the page with the Print button', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderPage('/reports');

    await userEvent.click(screen.getByRole('button', { name: 'Print' }));

    expect(print).toHaveBeenCalledOnce();
  });
});
