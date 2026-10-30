import api from './axios.js';

// Calls to the /reports and /insights endpoints (docs/api-plan.md, endpoints 36–38).
// Each function returns the `data` part of the API answer ({ success: true, data }).
// When a request fails, the axios error is thrown: show it with getErrorMessage() from ./axios.js.

// month: 'YYYY-MM' (optional; the server uses the current month in Vietnam time by default)
// Returns { month, currency,
//   totals: { income, expense, balance }, previousMonth, previousTotals: { income, expense, balance },
//   changes: { income, expense, balance },   // % change from last month, null when last month was 0
//   topCategories: [{ categoryId, name, color, icon, total, percent, previousTotal, changePercent }],
//   dailyExpense: [{ date: 'YYYY-MM-DD', total }],   // every day of the month
//   averagePerDay, noSpendDays,
//   largestExpense: { _id, amount, note, date, category: { _id, name, color, icon } } or null,
//   topTags: [{ tag, total, count }] }
export async function getMonthlyReport(month) {
  const response = await api.get('/reports/monthly', { params: { month } });
  return response.data.data;
}

// year: 4 digits, as a number or text (optional; the current year by default)
// Returns { year, currency, months: [{ month, income, expense, balance }] (12, January first),
//           totals: { income, expense, balance }, topExpenseMonth: { month, expense } or null }
export async function getYearlyReport(year) {
  const response = await api.get('/reports/yearly', { params: { year } });
  return response.data.data;
}

// Returns { month, currency, insights: [{ type, severity: 'info' | 'warning' | 'success', message, link }] },
// at most 6, warnings first. `link` is a path inside the app, e.g. '/transactions?from=2026-10-10&to=2026-10-10'.
export async function getInsights(month) {
  const response = await api.get('/insights', { params: { month } });
  return response.data.data;
}
