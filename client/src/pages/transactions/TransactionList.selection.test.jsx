import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionList from './TransactionList.jsx';
import BulkBar from './BulkBar.jsx';

const food = { _id: 'c1', name: 'Food', color: '#F07D62', icon: '🍜' };
const bills = { _id: 'c2', name: 'Bills', color: '#F19A52', icon: null };
const base = { type: 'expense', amount: 100000, date: '2026-10-01T05:00:00.000Z', tags: [] };
const rows = [
  { ...base, _id: 't1', category: food, note: 'Lunch' },
  { ...base, _id: 't2', category: bills, note: 'Rent' },
  { ...base, _id: 't3', category: food, note: '' },
];

function renderList(props = {}) {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onTagClick: vi.fn(), onToggle: vi.fn(), onToggleAll: vi.fn() };
  render(<TransactionList transactions={rows} {...handlers} {...props} />);
  return handlers;
}

// The table and the phone list both exist in the DOM (the css hides one), so every box appears twice
const boxes = (name) => screen.getAllByRole('checkbox', { name });

describe('TransactionList selection', () => {
  it('has no checkboxes when selection is not used', () => {
    render(<TransactionList transactions={rows} onEdit={vi.fn()} onDelete={vi.fn()} onTagClick={vi.fn()} />);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('has a checkbox for every row, named after the note or the category', () => {
    renderList();
    expect(boxes('Select Lunch')).toHaveLength(2);
    expect(boxes('Select Rent')).toHaveLength(2);
    expect(boxes('Select Food')).toHaveLength(2); // t3 has no note
  });

  it('ticks the rows that are in selectedIds', () => {
    renderList({ selectedIds: new Set(['t2']) });
    expect(boxes('Select Rent').every((box) => box.checked)).toBe(true);
    expect(boxes('Select Lunch').every((box) => !box.checked)).toBe(true);
  });

  it('calls onToggle with the id of the row that was clicked', async () => {
    const { onToggle } = renderList();
    await userEvent.click(boxes('Select Rent')[0]);
    expect(onToggle).toHaveBeenCalledWith('t2');
  });

  it('the select-all box asks to select every row', async () => {
    const { onToggleAll } = renderList();
    await userEvent.click(boxes('Select all on this page')[0]);
    expect(onToggleAll).toHaveBeenCalledWith(true);
  });

  it('the select-all box is checked when every row is selected, and asks to clear', async () => {
    const { onToggleAll } = renderList({ selectedIds: new Set(['t1', 't2', 't3']) });
    const [box] = boxes('Select all on this page');
    expect(box.checked).toBe(true);
    expect(box.indeterminate).toBe(false);

    await userEvent.click(box);
    expect(onToggleAll).toHaveBeenCalledWith(false);
  });

  it('the select-all box shows a dash when only some rows are selected', () => {
    renderList({ selectedIds: new Set(['t1']) });
    const [box] = boxes('Select all on this page');
    expect(box.checked).toBe(false);
    expect(box.indeterminate).toBe(true);
  });

  it('shows the category icon, or the first letter on the phone list when there is none', () => {
    renderList();
    expect(screen.getAllByText('🍜').length).toBeGreaterThan(0);
    expect(screen.getByText('B')).toBeInTheDocument(); // Bills has no icon
  });
});

describe('BulkBar', () => {
  function renderBar() {
    const handlers = { onChangeCategory: vi.fn(), onDelete: vi.fn(), onClear: vi.fn() };
    render(<BulkBar count={3} {...handlers} />);
    return handlers;
  }

  it('says how many rows are selected', () => {
    renderBar();
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('has the three actions', async () => {
    const { onChangeCategory, onDelete, onClear } = renderBar();

    await userEvent.click(screen.getByRole('button', { name: 'Change category' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(onChangeCategory).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
