import api from './axios.js';

// Calls to the /transactions endpoints (docs/api-plan.md, endpoints 10–14).
// Each function returns the `data` part of the API answer ({ success: true, data }).
// When a request fails, the axios error is thrown: show it with getErrorMessage() from ./axios.js.

// filters: { month: 'YYYY-MM', categoryId } (both optional; the server uses the current month by default)
// Returns the list, newest first, each item with its `category` ({ _id, name, color }).
export async function getTransactions(filters = {}) {
  const response = await api.get('/transactions', { params: filters });
  return response.data.data;
}

// transaction: { categoryId, amount, note, date }. The type comes from the category; the currency defaults to VND.
export async function createTransaction(transaction) {
  const response = await api.post('/transactions', transaction);
  return response.data.data;
}

// changes: any of { categoryId, amount, note, date }
export async function updateTransaction(id, changes) {
  const response = await api.patch(`/transactions/${id}`, changes);
  return response.data.data;
}

// Returns { _id } of the deleted transaction.
export async function deleteTransaction(id) {
  const response = await api.delete(`/transactions/${id}`);
  return response.data.data;
}
