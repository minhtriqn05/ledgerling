import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RuleRow from './RuleRow.jsx';

// formatVnd puts a non-breaking space (U+00A0) before ₫
const NBSP = ' ';

// A rule as the API returns it. Each test changes only what it needs.
function makeRule(overrides = {}) {
  return {
    _id: 'r1',
    category: { _id: 'c1', name: 'Bills', color: '#F19A52', type: 'expense' },
    amount: 3500000,
    note: 'Rent',
    frequency: 'monthly',
    startDate: '2026-08-31T05:00:00.000Z',
    nextRunDate: '2026-11-30T05:00:00.000Z',
    endDate: null,
    active: true,
    ended: false,
    ...overrides,
  };
}

function renderRow(rule, props = {}) {
  const handlers = { onToggle: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  render(<RuleRow rule={rule} toggling={false} {...handlers} {...props} />);
  return handlers;
}

describe('RuleRow', () => {
  it('shows the category, note, signed amount, frequency and next run', () => {
    renderRow(makeRule());

    expect(screen.getByText('Bills')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
    expect(screen.getByText(`−3.500.000${NBSP}₫`)).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('30 Nov 2026')).toBeInTheDocument();
  });

  it('shows an income rule with a plus', () => {
    renderRow(makeRule({ category: { _id: 'c2', name: 'Salary', color: '#3DB383', type: 'income' }, frequency: 'weekly' }));

    expect(screen.getByText(`+3.500.000${NBSP}₫`)).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
  });

  it('says Paused instead of a date when the rule is off', () => {
    renderRow(makeRule({ active: false }));

    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.queryByText('30 Nov 2026')).not.toBeInTheDocument();
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('says Ended when the rule has passed its end date', () => {
    renderRow(makeRule({ ended: true }));
    expect(screen.getByText('Ended')).toBeInTheDocument();
  });

  it('names the buttons after the category when there is no note', () => {
    renderRow(makeRule({ note: '' }));

    expect(screen.getByRole('switch', { name: 'Active: Bills' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Edit Bills' })).toBeInTheDocument();
  });

  it('calls its handlers', async () => {
    const rule = makeRule();
    const { onToggle, onEdit, onDelete } = renderRow(rule);

    await userEvent.click(screen.getByRole('switch', { name: 'Active: Rent' }));
    expect(onToggle).toHaveBeenCalledWith(rule);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Rent' }));
    expect(onEdit).toHaveBeenCalledWith(rule);
    await userEvent.click(screen.getByRole('button', { name: 'Delete Rent' }));
    expect(onDelete).toHaveBeenCalledWith(rule);
  });

  it('locks the switch while the API is working', () => {
    renderRow(makeRule(), { toggling: true });
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
