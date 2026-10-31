import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RuleFormDialog from './RuleFormDialog.jsx';
import { createRecurringRule, updateRecurringRule } from '../../api/recurring.js';

vi.mock('../../api/recurring.js', () => ({ createRecurringRule: vi.fn(), updateRecurringRule: vi.fn() }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const categories = [
  { _id: 'c1', name: 'Bills', type: 'expense', color: '#F19A52' },
  { _id: 'c2', name: 'Salary', type: 'income', color: '#3DB383' },
];

const savedRule = {
  _id: 'r1',
  category: categories[0],
  amount: 3500000,
  note: 'Rent',
  frequency: 'weekly',
  startDate: '2026-08-10T05:00:00.000Z',
  nextRunDate: '2026-11-02T05:00:00.000Z',
  endDate: '2027-08-10T05:00:00.000Z',
  active: true,
  ended: false,
};

function renderDialog(rule = null) {
  const handlers = { onSaved: vi.fn(), onClose: vi.fn() };
  render(
    <MemoryRouter>
      <RuleFormDialog rule={rule} categories={categories} {...handlers} />
    </MemoryRouter>
  );
  return handlers;
}

// A date input is simplest to change with one event
function setDate(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeAll(() => {
  // jsdom has no <dialog> behaviour yet; the Modal only needs showModal to exist
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.open = true;
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RuleFormDialog', () => {
  it('sends the rule with its dates as days', async () => {
    createRecurringRule.mockResolvedValue(savedRule);
    const { onSaved } = renderDialog();

    await userEvent.type(screen.getByLabelText('Amount'), '3500000');
    await userEvent.click(screen.getByRole('button', { name: 'Bills' }));
    setDate('Start date', '2026-08-31');
    await userEvent.type(screen.getByLabelText('Note'), ' Rent ');
    await userEvent.click(screen.getByRole('button', { name: 'Save rule' }));

    expect(createRecurringRule).toHaveBeenCalledWith({
      categoryId: 'c1',
      amount: 3500000,
      note: 'Rent',
      frequency: 'monthly',
      startDate: '2026-08-31',
      endDate: null,
    });
    expect(onSaved).toHaveBeenCalledWith(savedRule);
  });

  it('only offers the categories of the chosen type', async () => {
    renderDialog();
    expect(screen.queryByRole('button', { name: 'Salary' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Income' }));
    expect(screen.getByRole('button', { name: 'Salary' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bills' })).not.toBeInTheDocument();
  });

  it('refuses a missing amount, a missing category and an end date that is not after the start', async () => {
    renderDialog();
    const save = screen.getByRole('button', { name: 'Save rule' });

    await userEvent.click(save);
    expect(screen.getByText('Please enter an amount greater than 0.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Amount'), '1000');
    await userEvent.click(save);
    expect(screen.getByText('Please choose a category.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Bills' }));
    setDate('Start date', '2026-10-10');
    setDate('End date (optional)', '2026-10-10');
    await userEvent.click(save);
    expect(screen.getByText('The end date must be after the start date.')).toBeInTheDocument();
    expect(createRecurringRule).not.toHaveBeenCalled();
  });

  it('explains what happens on day 29-31, for a monthly rule only', async () => {
    const text = 'In shorter months this rule runs on the last day of the month.';
    renderDialog();

    setDate('Start date', '2026-10-28');
    expect(screen.queryByText(text)).not.toBeInTheDocument();

    setDate('Start date', '2026-10-31');
    expect(screen.getByText(text)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Weekly' }));
    expect(screen.queryByText(text)).not.toBeInTheDocument();
  });

  it('starts from the rule when editing, and saves with PUT', async () => {
    updateRecurringRule.mockResolvedValue(savedRule);
    const { onSaved } = renderDialog(savedRule);

    expect(screen.getByLabelText('Amount')).toHaveValue('3,500,000');
    expect(screen.getByLabelText('Start date')).toHaveValue('2026-08-10');
    expect(screen.getByLabelText('End date (optional)')).toHaveValue('2027-08-10');
    expect(screen.getByText('Transactions already created stay as they are.')).toBeInTheDocument();

    setDate('End date (optional)', '');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(updateRecurringRule).toHaveBeenCalledWith('r1', {
      categoryId: 'c1',
      amount: 3500000,
      note: 'Rent',
      frequency: 'weekly',
      startDate: '2026-08-10',
      endDate: null,
    });
    expect(onSaved).toHaveBeenCalledWith(savedRule);
  });
});
