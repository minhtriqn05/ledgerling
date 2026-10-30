import api from './axios.js';

// Calls to the /goals endpoints (docs/api-plan.md, endpoints 29–35).
// Each function returns the `data` part of the API answer ({ success: true, data }).
// When a request fails, the axios error is thrown: show it with getErrorMessage() from ./axios.js.

// Returns my goals: the ones still to reach first (nearest deadline first), completed goals last. Each one has
// `name`, `targetAmount`, `savedAmount`, `deadline` (or null), `color`, `progress` (0–100), `remaining` and `completed`.
// The list has no `contributions`: use getGoal() for the history.
export async function getGoals() {
  const response = await api.get('/goals');
  return response.data.data;
}

// The goal with its `contributions`, newest first. Each one has `_id`, `amount` (negative = withdrawal), `note` and `date`.
export async function getGoal(id) {
  const response = await api.get(`/goals/${id}`);
  return response.data.data;
}

// goal: { name, targetAmount, deadline, color } – the deadline is 'YYYY-MM-DD' or null, and must be after today
export async function createGoal(goal) {
  const response = await api.post('/goals', goal);
  return response.data.data;
}

// Replaces name, target, deadline and color: same fields as createGoal. The saved amount is not changed.
export async function updateGoal(id, goal) {
  const response = await api.put(`/goals/${id}`, goal);
  return response.data.data;
}

// Returns { _id } of the deleted goal.
export async function deleteGoal(id) {
  const response = await api.delete(`/goals/${id}`);
  return response.data.data;
}

// contribution: { amount, note, date } – a positive amount adds money, a negative one withdraws it.
// note and date ('YYYY-MM-DD', default today) are optional. Returns the goal with its new savedAmount and history.
export async function addContribution(id, contribution) {
  const response = await api.post(`/goals/${id}/contributions`, contribution);
  return response.data.data;
}

// Takes a contribution back. Returns the goal with its new savedAmount and history.
export async function deleteContribution(id, contributionId) {
  const response = await api.delete(`/goals/${id}/contributions/${contributionId}`);
  return response.data.data;
}
