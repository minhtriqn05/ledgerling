// Helpers for the wallets. A wallet comes from GET /api/wallets, with its balance already worked out by the server.

// Which icon of components/Icon.jsx stands for each type of wallet
export const WALLET_TYPES = [
  { value: 'cash', icon: 'banknote' },
  { value: 'bank', icon: 'bank' },
  { value: 'ewallet', icon: 'smartphone' },
];

export function walletIcon(type) {
  return WALLET_TYPES.find((option) => option.value === type)?.icon ?? 'wallet';
}

// The money in all the wallets together. An archived wallet still holds its money, so it counts.
export function totalBalance(wallets) {
  return wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
}

// The wallets that can take new money
export function activeWallets(wallets) {
  return wallets.filter((wallet) => !wallet.archived);
}

// The wallet a new transaction starts in. Falls back to the first one that takes money; undefined without any.
export function defaultWalletId(wallets) {
  const usable = activeWallets(wallets);
  return (usable.find((wallet) => wallet.isDefault) ?? usable[0])?._id;
}

// The wallets a transaction can be in: the active ones, plus its own wallet when that one is archived,
// so editing an old transaction never changes its wallet by accident.
export function selectableWallets(wallets, currentWalletId) {
  return wallets.filter((wallet) => !wallet.archived || wallet._id === currentWalletId);
}
