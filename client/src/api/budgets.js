import api from './axios.js';

// Calls to the /budgets endpoints (docs/api-plan.md, endpoints 16–19).
// Each function returns the `data` part of the API answer ({ success: true, data }).
// When a request fails, the axios error is thrown: show it with getErrorMessage() from ./axios.js.

// month: 'YYYY-MM' (optional; the server uses the current month by default)
// Returns the budgets of that month, sorted by category name. Each one has `category` ({ _id, name, color }),
// `amount`, `spent`, `remaining`, `percent` and `status` ('ok' | 'warning' | 'over').
export async function getBudgets(month) {
  const response = await api.get('/budgets', { params: month ? { month } : {} });
  return response.data.data;
}

// budget: { categoryId, month, amount }
export async function createBudget(budget) {
  const response = await api.post('/budgets', budget);
  return response.data.data;
}

// Only the amount can change.
export async function updateBudget(id, amount) {
  const response = await api.patch(`/budgets/${id}`, { amount });
  return response.data.data;
}

// Returns { _id } of the deleted budget.
export async function deleteBudget(id) {
  const response = await api.delete(`/budgets/${id}`);
  return response.data.data;
}
