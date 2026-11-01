import { describe, expect, it } from 'vitest';
import { activeWallets, defaultWalletId, selectableWallets, totalBalance, walletIcon } from './wallets.js';

const cash = { _id: 'cash', name: 'Cash', type: 'cash', isDefault: true, archived: false, balance: 300 };
const bank = { _id: 'bank', name: 'Bank', type: 'bank', isDefault: false, archived: false, balance: 700 };
const old = { _id: 'old', name: 'Old', type: 'ewallet', isDefault: false, archived: true, balance: 50 };

describe('totalBalance', () => {
  it('adds up every wallet, also an archived one, and is 0 without wallets', () => {
    expect(totalBalance([cash, bank, old])).toBe(1050);
    expect(totalBalance([])).toBe(0);
  });

  it('counts a wallet below 0', () => {
    expect(totalBalance([{ ...cash, balance: -100 }, bank])).toBe(600);
  });
});

describe('activeWallets', () => {
  it('leaves out the archived ones', () => {
    expect(activeWallets([cash, bank, old]).map((w) => w._id)).toEqual(['cash', 'bank']);
  });
});

describe('defaultWalletId', () => {
  it('is the default wallet, wherever it is in the list', () => {
    expect(defaultWalletId([bank, old, cash])).toBe('cash');
  });

  it('falls back to the first active wallet, and is undefined when there is none', () => {
    expect(defaultWalletId([old, bank])).toBe('bank');
    expect(defaultWalletId([old])).toBeUndefined();
    expect(defaultWalletId([])).toBeUndefined();
  });
});

describe('selectableWallets', () => {
  it('has the active wallets', () => {
    expect(selectableWallets([cash, bank, old]).map((w) => w._id)).toEqual(['cash', 'bank']);
  });

  it('keeps the archived wallet the transaction is already in', () => {
    expect(selectableWallets([cash, bank, old], 'old').map((w) => w._id)).toEqual(['cash', 'bank', 'old']);
  });
});

describe('walletIcon', () => {
  it('has an icon for every type and a general one for anything else', () => {
    expect(walletIcon('cash')).toBe('banknote');
    expect(walletIcon('bank')).toBe('bank');
    expect(walletIcon('ewallet')).toBe('smartphone');
    expect(walletIcon('gold')).toBe('wallet');
  });
});
