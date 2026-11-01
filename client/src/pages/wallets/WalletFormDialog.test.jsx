import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletFormDialog from './WalletFormDialog.jsx';
import { createWallet, updateWallet } from '../../api/wallets.js';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../../api/wallets.js', () => ({ createWallet: vi.fn(), updateWallet: vi.fn() }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => toast }));
// jsdom does not read tokens.css, so the colors come from here
vi.mock('../../utils/cssVar.js', () => ({ cssVar: (name) => `#00000${name.slice(-1)}` }));

function renderDialog(wallet) {
  const handlers = { onSaved: vi.fn(), onClose: vi.fn() };
  render(<WalletFormDialog wallet={wallet} {...handlers} />);
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
  createWallet.mockResolvedValue({ _id: 'new' });
  updateWallet.mockResolvedValue({ _id: 'w1' });
});

describe('WalletFormDialog', () => {
  it('creates a wallet with what was filled in', async () => {
    const { onSaved } = renderDialog();
    await userEvent.type(screen.getByLabelText('Name'), '  Vietcombank ');
    await userEvent.type(screen.getByLabelText('Starting balance'), '5000000');
    await userEvent.click(screen.getByRole('button', { name: 'Teal' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save wallet' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ _id: 'new' }));
    expect(createWallet).toHaveBeenCalledWith({ name: 'Vietcombank', type: 'bank', color: '#000003', initialBalance: 5000000 });
  });

  it('asks for a name and sends nothing', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Save wallet' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(createWallet).not.toHaveBeenCalled();
  });

  it('starts from the wallet when editing, and updates it', async () => {
    const wallet = { _id: 'w1', name: 'MoMo', type: 'ewallet', color: '#000005', initialBalance: 200000, isDefault: false };
    const { onSaved } = renderDialog(wallet);

    expect(screen.getByRole('heading', { name: 'Edit wallet' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('MoMo');
    expect(screen.getByLabelText('Starting balance')).toHaveValue('200,000');
    expect(screen.getByRole('button', { name: 'E-wallet' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(updateWallet).toHaveBeenCalledWith('w1', { name: 'MoMo', type: 'ewallet', color: '#000005', initialBalance: 200000 });
  });

  it('explains the default wallet when it is edited', () => {
    renderDialog({ _id: 'c', name: 'Cash', type: 'cash', color: '#000006', initialBalance: 0, isDefault: true });
    expect(screen.getByText(/cannot be archived or deleted/)).toBeInTheDocument();
  });

  it('shows the error of the server and stays open', async () => {
    createWallet.mockRejectedValue({ response: { data: { message: 'Wallet already exists', code: 'WALLET_EXISTS' } } });
    const { onSaved } = renderDialog();
    await userEvent.type(screen.getByLabelText('Name'), 'Cash');
    await userEvent.click(screen.getByRole('button', { name: 'Save wallet' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('You already have a wallet with this name'));
    expect(onSaved).not.toHaveBeenCalled();
  });
});
