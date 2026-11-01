import api from './axios.js';

// Calls to the /wallets and /transfers endpoints (docs/api-plan.md, "Wallets").
// Each function returns the `data` part of the API answer ({ success: true, data }).
// When a request fails, the axios error is thrown: show it with getErrorMessage() from ./axios.js.

// Returns my wallets, the default one first. Each one has `name`, `type`, `color`, `initialBalance`, `archived`, `isDefault`,
// its totals (`income`, `expense`, `transfersIn`, `transfersOut`) and its `balance`.
export async function getWallets() {
  const response = await api.get('/wallets');
  return response.data.data;
}

// wallet: { name, type: 'cash' | 'bank' | 'ewallet', color, initialBalance }
export async function createWallet(wallet) {
  const response = await api.post('/wallets', wallet);
  return response.data.data;
}

// changes: any of { name, type, color, initialBalance, archived }
export async function updateWallet(id, changes) {
  const response = await api.patch(`/wallets/${id}`, changes);
  return response.data.data;
}

// Returns { _id } of the deleted wallet.
export async function deleteWallet(id) {
  const response = await api.delete(`/wallets/${id}`);
  return response.data.data;
}

// filters (all optional): walletId, page (default 1), limit (default 20, at most 100).
// Returns one page, newest first: { items, meta }. Each item has `from` and `to` (the two wallets), `amount`, `note` and `date`.
export async function getTransfers(filters = {}) {
  const response = await api.get('/transfers', { params: filters });
  return { items: response.data.data, meta: response.data.meta };
}

// transfer: { fromWalletId, toWalletId, amount, date, note }
export async function createTransfer(transfer) {
  const response = await api.post('/transfers', transfer);
  return response.data.data;
}

// The money goes back. Returns { _id } of the deleted transfer.
export async function deleteTransfer(id) {
  const response = await api.delete(`/transfers/${id}`);
  return response.data.data;
}
