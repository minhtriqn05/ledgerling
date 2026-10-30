import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportDialog from './ImportDialog.jsx';
import { importTransactions } from '../../api/transactions.js';

vi.mock('../../api/transactions.js', () => ({ importTransactions: vi.fn() }));

const categories = [
  { _id: 'c1', name: 'Food', type: 'expense' },
  { _id: 'c2', name: 'Salary', type: 'income' },
];

const HEADER = 'Date,Type,Category,Amount,Currency,Note,Tags';
const GOOD = '2026-10-27 12:30,expense,Food,45000,VND,Lunch,work;trip';
const BAD_CATEGORY = '2026-10-28 09:00,expense,Groceries,10000,VND,,';
const GOOD_INCOME = '2026-10-29 09:00,income,Salary,9000000,VND,Pay,';

function csvFile(...lines) {
  return new File([lines.join('\r\n')], 'ledgerling-2026-10.csv', { type: 'text/csv' });
}

function renderDialog(props = {}) {
  const handlers = { onImported: vi.fn(), onClose: vi.fn() };
  render(<ImportDialog categories={categories} {...handlers} {...props} />);
  return handlers;
}

beforeAll(() => {
  // jsdom has no <dialog> behaviour yet; the Modal only needs showModal to exist
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.setAttribute('open', '');
  };
});

beforeEach(() => {
  importTransactions.mockReset();
});

describe('ImportDialog', () => {
  it('starts without a preview and with Import disabled', () => {
    renderDialog();

    expect(screen.getByLabelText('CSV file')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import 0 rows' })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Preview of the file' })).not.toBeInTheDocument();
  });

  it('previews the rows and marks the ones that cannot be imported', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.upload(screen.getByLabelText('CSV file'), csvFile(HEADER, GOOD, BAD_CATEGORY, GOOD_INCOME));

    expect(await screen.findByText(/3 rows found\./)).toHaveTextContent('1 row with a problem will be skipped.');
    const rows = within(screen.getByRole('region', { name: 'Preview of the file' })).getAllByRole('row');
    expect(rows).toHaveLength(4); // header + 3
    expect(within(rows[1]).getByText('Ready')).toBeInTheDocument();
    expect(within(rows[1]).getByText('#work #trip')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Category "Groceries" (expense) not found')).toBeInTheDocument();
    expect(within(rows[3]).getByText('Ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import 2 rows' })).toBeEnabled();
  });

  it('sends every row, then shows how many were imported and why the others were not', async () => {
    const user = userEvent.setup();
    const { onImported } = renderDialog();
    const answer = { imported: 2, failed: 1, errors: [{ row: 2, message: 'Category "Groceries" (expense) not found' }] };
    importTransactions.mockResolvedValue(answer);

    await user.upload(screen.getByLabelText('CSV file'), csvFile(HEADER, GOOD, BAD_CATEGORY, GOOD_INCOME));
    await user.click(await screen.findByRole('button', { name: 'Import 2 rows' }));

    expect(importTransactions).toHaveBeenCalledTimes(1);
    const sent = importTransactions.mock.calls[0][0];
    expect(sent).toHaveLength(3);
    expect(sent[0]).toEqual({
      date: '2026-10-27 12:30',
      type: 'expense',
      category: 'Food',
      amount: 45000,
      currency: 'VND',
      note: 'Lunch',
      tags: ['work', 'trip'],
    });
    expect(onImported).toHaveBeenCalledWith(answer);

    expect(await screen.findByRole('status')).toHaveTextContent('Imported 2 transactions. 1 row could not be imported.');
    expect(screen.getByRole('list', { name: 'Rows that were not imported' })).toHaveTextContent(
      'Row 2: Category "Groceries" (expense) not found'
    );
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('refuses a file without the needed columns', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.upload(screen.getByLabelText('CSV file'), csvFile('Date,Note', '2026-10-27,Lunch'));

    expect(await screen.findByText(/has no Type, Category, Amount column/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Preview of the file' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import 0 rows' })).toBeDisabled();
  });

  it('keeps Import disabled when no row is usable', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.upload(screen.getByLabelText('CSV file'), csvFile(HEADER, BAD_CATEGORY));

    expect(await screen.findByText(/1 row found\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import 0 rows' })).toBeDisabled();
  });

  it('shows the error of the API and lets the user try again', async () => {
    const user = userEvent.setup();
    const { onImported } = renderDialog();
    importTransactions.mockRejectedValue({ response: { data: { message: 'You can import at most 500 rows at a time' } } });

    await user.upload(screen.getByLabelText('CSV file'), csvFile(HEADER, GOOD));
    await user.click(await screen.findByRole('button', { name: 'Import 1 row' }));

    expect(await screen.findByText('You can import at most 500 rows at a time')).toBeInTheDocument();
    expect(onImported).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Import 1 row' })).toBeEnabled();
  });
});
