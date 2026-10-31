import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoneyDialog from './MoneyDialog.jsx';
import { addContribution } from '../../api/goals.js';

vi.mock('../../api/goals.js', () => ({ addContribution: vi.fn() }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

// formatVnd puts a non-breaking space (U+00A0) before ₫
const NBSP = ' ';

const goal = { _id: 'g1', name: 'New laptop', targetAmount: 3000000, savedAmount: 500000 };
const savedGoal = { ...goal, savedAmount: 800000 };

function renderDialog(mode) {
  const handlers = { onSaved: vi.fn(), onClose: vi.fn() };
  render(<MoneyDialog goal={goal} mode={mode} {...handlers} />);
  return handlers;
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

describe('MoneyDialog', () => {
  it('adds money with a positive amount, the note and the date', async () => {
    addContribution.mockResolvedValue(savedGoal);
    const { onSaved } = renderDialog('add');

    expect(screen.getByText('Add money', { selector: 'h2' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Amount'), '300000');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-28' } });
    await userEvent.type(screen.getByLabelText('Note'), ' Bonus ');
    await userEvent.click(screen.getByRole('button', { name: 'Add to goal' }));

    expect(addContribution).toHaveBeenCalledWith('g1', { amount: 300000, note: 'Bonus', date: '2026-10-28' });
    expect(onSaved).toHaveBeenCalledWith(savedGoal);
  });

  it('withdraws money with a negative amount', async () => {
    addContribution.mockResolvedValue(savedGoal);
    const { onSaved } = renderDialog('withdraw');

    expect(screen.getByText('Withdraw money', { selector: 'h2' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Amount'), '200000');
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw from goal' }));

    expect(addContribution).toHaveBeenCalledWith('g1', expect.objectContaining({ amount: -200000, note: '' }));
    expect(onSaved).toHaveBeenCalledWith(savedGoal);
  });

  it('can withdraw exactly what is saved', async () => {
    addContribution.mockResolvedValue(savedGoal);
    renderDialog('withdraw');

    await userEvent.type(screen.getByLabelText('Amount'), '500000');
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw from goal' }));

    expect(addContribution).toHaveBeenCalledWith('g1', expect.objectContaining({ amount: -500000 }));
  });

  it('refuses to withdraw more than is saved, without asking the API', async () => {
    renderDialog('withdraw');

    await userEvent.type(screen.getByLabelText('Amount'), '500001');
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw from goal' }));

    expect(screen.getByText(`You can withdraw at most 500,000${NBSP}₫, the amount saved in this goal.`)).toBeInTheDocument();
    expect(addContribution).not.toHaveBeenCalled();
  });

  it('refuses an empty amount', async () => {
    renderDialog('add');

    await userEvent.click(screen.getByRole('button', { name: 'Add to goal' }));

    expect(screen.getByText('Please enter an amount greater than 0.')).toBeInTheDocument();
    expect(addContribution).not.toHaveBeenCalled();
  });

  it('keeps only digits in the amount and shows them with dots', async () => {
    renderDialog('add');

    const amount = screen.getByLabelText('Amount');
    await userEvent.type(amount, '1a2.5,0e0');
    expect(amount).toHaveValue('12,500');
  });

  it('stays open and keeps the fields when the API refuses', async () => {
    addContribution.mockRejectedValue({ response: { data: { message: 'You cannot withdraw more than the saved amount' } } });
    const { onSaved, onClose } = renderDialog('withdraw');

    await userEvent.type(screen.getByLabelText('Amount'), '100000');
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw from goal' }));

    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Amount')).toHaveValue('100,000');
    expect(screen.getByRole('button', { name: 'Withdraw from goal' })).toBeEnabled();
  });
});
