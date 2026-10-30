import api from './axios.js';

// Calls to the /recurring endpoints (docs/api-plan.md, endpoints 24–28).
// Each function returns the `data` part of the API answer ({ success: true, data }).
// When a request fails, the axios error is thrown: show it with getErrorMessage() from ./axios.js.

// Returns my rules, active ones first. Each one has `category` ({ _id, name, color, type }), `amount`, `note`,
// `frequency` ('weekly' | 'monthly'), `startDate`, `nextRunDate`, `endDate` (or null), `active` and `ended`.
export async function getRecurringRules() {
  const response = await api.get('/recurring');
  return response.data.data;
}

// rule: { categoryId, amount, note, frequency, startDate, endDate } – the dates are 'YYYY-MM-DD', endDate may be null
export async function createRecurringRule(rule) {
  const response = await api.post('/recurring', rule);
  return response.data.data;
}

// Replaces the whole rule: same fields as createRecurringRule.
export async function updateRecurringRule(id, rule) {
  const response = await api.put(`/recurring/${id}`, rule);
  return response.data.data;
}

// Turns the rule on or off. Returns the rule with its new `active` and `nextRunDate`.
export async function toggleRecurringRule(id) {
  const response = await api.patch(`/recurring/${id}/toggle`);
  return response.data.data;
}

// Returns { _id } of the deleted rule. The transactions it created are kept.
export async function deleteRecurringRule(id) {
  const response = await api.delete(`/recurring/${id}`);
  return response.data.data;
}
