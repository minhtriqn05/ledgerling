import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MonthlyTab from './MonthlyTab.jsx';
import { getInsights, getMonthlyReport } from '../../api/reports.js';

vi.mock('../../api/reports.js', () => ({ getMonthlyReport: vi.fn(), getInsights: vi.fn() }));
// Recharts needs a real layout to draw; jsdom has none, so the chart is replaced by a stub
vi.mock('./ReportCharts.jsx', () => ({ DailyExpenseChart: () => <div>daily chart</div> }));

function makeReport(overrides = {}) {
  return {
    month: '2026-10',
    currency: 'VND',
    totals: { income: 21500000, expense: 1250000, balance: 20250000 },
    previousMonth: '2026-09',
    previousTotals: { income: 18000000, expense: 1100000, balance: 16900000 },
    changes: { income: 19.4, expense: 13.6, balance: 19.8 },
    topCategories: [
      { categoryId: 'c1', name: 'Bills', color: '#F19A52', icon: null, total: 1000000, percent: 80, previousTotal: 800000, changePercent: 25 },
      { categoryId: 'c2', name: 'Transport', color: '#4A9FE3', icon: null, total: 50000, percent: 4, previousTotal: 0, changePercent: null },
    ],
    dailyExpense: [{ date: '2026-10-01', total: 0 }],
    averagePerDay: 40323,
    noSpendDays: 27,
    largestExpense: {
      _id: 't1',
      amount: 1000000,
      note: 'Electricity',
      date: '2026-10-10T02:00:00.000Z',
      category: { _id: 'c1', name: 'Bills', color: '#F19A52', icon: null },
    },
    topTags: [{ tag: 'work', total: 200000, count: 2 }],
    ...overrides,
  };
}

function renderTab() {
  return render(
    <MemoryRouter>
      <MonthlyTab month="2026-10" />
    </MemoryRouter>
  );
}

beforeEach(() => {
  getMonthlyReport.mockReset();
  getInsights.mockReset();
  getInsights.mockResolvedValue({ month: '2026-10', insights: [] });
});

describe('MonthlyTab', () => {
  it('shows the three cards with the change from last month', async () => {
    getMonthlyReport.mockResolvedValue(makeReport());
    renderTab();

    const totals = await screen.findByRole('region', { name: 'Totals for October 2026' });
    expect(within(totals).getByText('21.500.000 ₫')).toBeInTheDocument();
    expect(within(totals).getByText('1.250.000 ₫')).toBeInTheDocument();
    expect(within(totals).getByText('20.250.000 ₫')).toBeInTheDocument();
    expect(within(totals).getByText('Up 19.4% from last month')).toBeInTheDocument();
    expect(within(totals).getByText('Up 13.6% from last month')).toBeInTheDocument();
    expect(within(totals).getByText('Up 19.8% from last month')).toBeInTheDocument();
  });

  it('shows "No data last month" when the change is null', async () => {
    getMonthlyReport.mockResolvedValue(makeReport({ changes: { income: null, expense: null, balance: null } }));
    renderTab();

    const totals = await screen.findByRole('region', { name: 'Totals for October 2026' });
    expect(within(totals).getAllByText('No data last month')).toHaveLength(6); // 3 cards x (visible + screen reader text)
  });

  it('shows the facts: average per day, no-spend days and the largest expense', async () => {
    getMonthlyReport.mockResolvedValue(makeReport());
    renderTab();

    const facts = await screen.findByRole('region', { name: 'Quick facts' });
    expect(within(facts).getByText('40.323 ₫')).toBeInTheDocument();
    expect(within(facts).getByText('27')).toBeInTheDocument();
    expect(within(facts).getByText('1.000.000 ₫')).toBeInTheDocument();
    expect(within(facts).getByText(/Bills · 10 Oct 2026 · Electricity/)).toBeInTheDocument();
  });

  it('lists the top categories with share and change, and the top tags', async () => {
    getMonthlyReport.mockResolvedValue(makeReport());
    renderTab();

    const bills = (await screen.findByRole('rowheader', { name: 'Bills' })).closest('tr');
    expect(within(bills).getByText('1.000.000 ₫')).toBeInTheDocument();
    expect(within(bills).getByText('80%')).toBeInTheDocument();
    expect(within(bills).getByText('Up 25% from last month')).toBeInTheDocument();

    const transport = screen.getByRole('rowheader', { name: 'Transport' }).closest('tr');
    expect(within(transport).getByText('No data last month', { selector: '[data-testid]' })).toBeInTheDocument();

    expect(screen.getByText('#work')).toBeInTheDocument();
    expect(screen.getByText('2 transactions')).toBeInTheDocument();
    expect(screen.getByText('200.000 ₫')).toBeInTheDocument();
  });

  it('shows an empty state for a month without transactions', async () => {
    getMonthlyReport.mockResolvedValue(
      makeReport({
        totals: { income: 0, expense: 0, balance: 0 },
        changes: { income: null, expense: null, balance: null },
        topCategories: [],
        topTags: [],
        largestExpense: null,
      })
    );
    renderTab();

    expect(await screen.findByText('No transactions in October 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add transaction' })).toBeInTheDocument();
  });

  it('copes with a month that has income but no expenses', async () => {
    getMonthlyReport.mockResolvedValue(
      makeReport({
        totals: { income: 1000000, expense: 0, balance: 1000000 },
        topCategories: [],
        topTags: [],
        largestExpense: null,
        averagePerDay: 0,
      })
    );
    renderTab();

    expect(await screen.findByText('No expenses in October 2026.')).toBeInTheDocument();
    expect(screen.getByText('No tags used on expenses in October 2026.')).toBeInTheDocument();
    expect(screen.getByText('No expenses this month')).toBeInTheDocument();
  });

  it('shows an error with a retry button', async () => {
    getMonthlyReport.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(makeReport());
    renderTab();

    const retry = await screen.findByRole('button', { name: 'Try again' });
    retry.click();

    expect(await screen.findByRole('region', { name: 'Totals for October 2026' })).toBeInTheDocument();
  });
});
