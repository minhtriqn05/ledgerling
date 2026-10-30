import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TransactionList from './TransactionList.jsx';

const category = { _id: 'c1', name: 'Bills', color: '#F19A52' };
const base = { category, type: 'expense', amount: 100000, date: '2026-10-01T05:00:00.000Z', tags: [] };

function renderList(transactions) {
  render(<TransactionList transactions={transactions} onEdit={vi.fn()} onDelete={vi.fn()} onTagClick={vi.fn()} />);
}

describe('TransactionList', () => {
  it('shows the Recurring label in the table and in the phone list', () => {
    renderList([{ ...base, _id: 't1', note: 'Rent', recurringRuleId: 'r1' }]);
    // One in the table, one in the phone list (the css hides one of them)
    expect(screen.getAllByText('Recurring')).toHaveLength(2);
  });

  it('shows no label on a normal transaction', () => {
    renderList([{ ...base, _id: 't2', note: 'Lunch' }]);
    expect(screen.queryByText('Recurring')).not.toBeInTheDocument();
  });
});
