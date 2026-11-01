import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletCard from './WalletCard.jsx';

const bank = {
  _id: 'w1',
  name: 'Vietcombank',
  type: 'bank',
  color: '#4A9FE3',
  initialBalance: 1000000,
  income: 500000,
  expense: 100000,
  transfersIn: 50000,
  transfersOut: 300000,
  balance: 1150000,
  archived: false,
  isDefault: false,
};

function renderCard(wallet) {
  const handlers = { onEdit: vi.fn(), onArchive: vi.fn(), onRestore: vi.fn(), onDelete: vi.fn() };
  render(<WalletCard wallet={wallet} {...handlers} />);
  return handlers;
}

describe('WalletCard', () => {
  it('shows the name, the type, the balance and where the money came from', () => {
    renderCard(bank);
    const card = screen.getByTestId('wallet-card');

    expect(within(card).getByRole('heading', { name: 'Vietcombank' })).toBeInTheDocument();
    expect(within(card).getByText('Bank')).toBeInTheDocument();
    expect(within(card).getByTestId('wallet-balance')).toHaveTextContent('1,150,000');
    expect(within(card).getByText(/Started with 1,000,000/)).toBeInTheDocument();
    // Money in = income + transfers in; money out = expense + transfers out
    expect(within(card).getByText(/\+550,000/)).toBeInTheDocument();
    expect(within(card).getByText(/−400,000/)).toBeInTheDocument();
  });

  it('shows no plus or minus sign on nothing', () => {
    renderCard({ ...bank, income: 0, expense: 0, transfersIn: 0, transfersOut: 0, balance: 1000000 });
    expect(screen.queryByText(/\+0/)).not.toBeInTheDocument();
    expect(screen.queryByText(/−0/)).not.toBeInTheDocument();
  });

  it('a normal wallet can be edited, archived and deleted', async () => {
    const handlers = renderCard(bank);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Vietcombank' }));
    await userEvent.click(screen.getByRole('button', { name: 'Archive Vietcombank' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Vietcombank' }));

    expect(handlers.onEdit).toHaveBeenCalledWith(bank);
    expect(handlers.onArchive).toHaveBeenCalledWith(bank);
    expect(handlers.onDelete).toHaveBeenCalledWith(bank);
  });

  it('the default wallet says so, and can only be edited', () => {
    renderCard({ ...bank, name: 'Cash', type: 'cash', isDefault: true });
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Cash' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive Cash' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Cash' })).not.toBeInTheDocument();
  });

  it('an archived wallet can come back', async () => {
    const wallet = { ...bank, archived: true };
    const handlers = renderCard(wallet);
    expect(screen.queryByRole('button', { name: 'Archive Vietcombank' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Bring back Vietcombank' }));
    expect(handlers.onRestore).toHaveBeenCalledWith(wallet);
  });

  it('a balance below 0 shows its minus', () => {
    renderCard({ ...bank, balance: -2500 });
    expect(screen.getByTestId('wallet-balance')).toHaveTextContent('-2,500');
  });
});
