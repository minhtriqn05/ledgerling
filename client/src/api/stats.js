import api from './axios.js';

// Calls to the /stats endpoints (docs/api-plan.md, endpoint 15).
// Returns the `data` part of the API answer ({ success: true, data }).
// When a request fails, the axios error is thrown: show it with getErrorMessage() from ./axios.js.

// month: 'YYYY-MM' (optional; the server uses the current month in Vietnam time by default)
// Returns { month, currency, totalIncome, totalExpense, balance,
//           expenseByCategory: [{ categoryId, name, color, total }],   // biggest first
//           byMonth: [{ month, income, expense }] }                    // 6 months, oldest first
export async function getSummary(month) {
  const response = await api.get('/stats/summary', { params: { month } });
  return response.data.data;
}
