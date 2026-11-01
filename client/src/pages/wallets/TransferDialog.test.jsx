import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransferDialog from './TransferDialog.jsx';
import { createTransfer } from '../../api/wallets.js';
import { fromDateInput, todayInput } from '../../utils/vnDate.js';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../../api/wallets.js', () => ({ createTransfer: vi.fn() }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => toast }));

const wallets = [
  { _id: 'cash', name: 'Cash', balance: 200000 },
  { _id: 'bank', name: 'Vietcombank', balance: 1000000 },
  { _id: 'momo', name: 'MoMo', balance: 0 },
];

function renderDialog() {
  const handlers = { onSaved: vi.fn(), onClose: vi.fn() };
  render(<TransferDialog wallets={wallets} {...handlers} />);
  return handlers;
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Move money' }));

async function choose(label, option) {
  await userEvent.click(screen.getByLabelText(label));
  await userEvent.click(screen.getByRole('option', { name: option }));
  // The list closes with a short animation; the next list must not meet this one
  await waitFor(() => expect(screen.queryByRole('option')).not.toBeInTheDocument());
}

beforeAll(() => {
  // jsdom has no <dialog> behaviour yet; the Modal only needs showModal to exist
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.open = true;
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  createTransfer.mockResolvedValue({ _id: 't1' });
});

describe('TransferDialog', () => {
  it('starts with two different wallets and today', () => {
    renderDialog();
    expect(screen.getByLabelText('From')).toHaveTextContent('Cash');
    expect(screen.getByLabelText('To')).toHaveTextContent('Vietcombank');
    expect(screen.getByLabelText('Date')).toHaveValue(todayInput());
  });

  it('sends what was chosen', async () => {
    const { onSaved } = renderDialog();
    await choose('From', 'Vietcombank');
    await choose('To', 'MoMo');
    await userEvent.type(screen.getByLabelText('Amount'), '300000');
    await userEvent.type(screen.getByLabelText('Note'), '  ATM ');
    await save();

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ _id: 't1' }));
    expect(createTransfer).toHaveBeenCalledWith({
      fromWalletId: 'bank',
      toWalletId: 'momo',
      amount: 300000,
      date: fromDateInput(todayInput()),
      note: 'ATM',
    });
  });

  it('keeps only the digits of the amount and shows them grouped', async () => {
    renderDialog();
    await userEvent.type(screen.getByLabelText('Amount'), '12a34.5');
    expect(screen.getByLabelText('Amount')).toHaveValue('12,345');
  });

  it('asks for two different wallets and sends nothing', async () => {
    renderDialog();
    await choose('To', 'Cash');
    await userEvent.type(screen.getByLabelText('Amount'), '1000');
    await save();

    expect(screen.getByText('Choose two different wallets.')).toBeInTheDocument();
    expect(createTransfer).not.toHaveBeenCalled();
  });

  it('asks for an amount and sends nothing', async () => {
    renderDialog();
    await save();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(createTransfer).not.toHaveBeenCalled();
  });

  it('shows the error of the server and stays open', async () => {
    createTransfer.mockRejectedValue({ response: { data: { message: 'Wallet is archived', code: 'WALLET_ARCHIVED' } } });
    const { onSaved } = renderDialog();
    await userEvent.type(screen.getByLabelText('Amount'), '1000');
    await save();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('This wallet is archived'));
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Move money' })).toBeEnabled();
  });
});
