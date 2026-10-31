import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionDrawer from './TransactionDrawer.jsx';

const transaction = {
  _id: 't1',
  type: 'expense',
  amount: 45000,
  note: 'Pho',
  date: '2026-10-25T05:00:00.000Z',
  tags: ['lunch', 'work'],
  category: { _id: 'c1', name: 'Food', color: '#F07D62', icon: 'utensils' },
};

function renderDrawer(overrides = {}) {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onClose: vi.fn() };
  const shown = { ...transaction, ...overrides };
  render(<TransactionDrawer transaction={shown} {...handlers} />);
  return { handlers, shown };
}

beforeEach(() => {
  // jsdom has no <dialog> behaviour yet; the Drawer only needs showModal to exist
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.open = true;
  };
});

describe('TransactionDrawer', () => {
  it('shows the amount, category, type, date, note and tags', () => {
    renderDrawer();
    expect(screen.getByText(/−45,000/)).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Expense')).toBeInTheDocument();
    expect(screen.getByText('25 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('#lunch #work')).toBeInTheDocument();
    expect(screen.getByTestId('category-mark').querySelector('svg')).toBeInTheDocument();
  });

  it('says when a recurring rule created the transaction', () => {
    renderDrawer({ recurringRuleId: 'r1' });
    expect(screen.getByText('Created by a rule')).toBeInTheDocument();
  });

  it('Edit, Delete and the X call the page with the transaction', async () => {
    const { handlers, shown } = renderDrawer();
    await userEvent.click(screen.getByRole('button', { name: 'Edit', hidden: true }));
    expect(handlers.onEdit).toHaveBeenCalledWith(shown);
    await userEvent.click(screen.getByRole('button', { name: 'Delete', hidden: true }));
    expect(handlers.onDelete).toHaveBeenCalledWith(shown);
    await userEvent.click(screen.getByRole('button', { name: 'Close', hidden: true }));
    expect(handlers.onClose).toHaveBeenCalled();
  });
});
