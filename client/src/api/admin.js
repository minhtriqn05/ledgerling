import api from './axios.js';

// Calls to the /admin endpoints (docs/api-plan.md, endpoints 57-59). Only an admin account gets an answer; anyone else gets a 403.
// Returns the `data` part of the API answer ({ success: true, data }).
// When a request fails, the axios error is thrown: show it with getErrorMessage() from ./axios.js.

// Returns { totalUsers, activeUsers7d, totalTransactions,
//           newUsersPerDay: [{ date: 'YYYY-MM-DD', count }],      // the last 30 days, oldest first
//           transactionsPerDay: [{ date, count }] }
export async function getAdminStats() {
  const response = await api.get('/admin/stats');
  return response.data.data;
}

// q: part of a name or an email ('' = everyone), page: from 1.
// Returns { users: [{ _id, name, email, role, status, createdAt, transactionCount }], meta: { page, limit, total, totalPages } }
export async function getAdminUsers({ q = '', page = 1 } = {}) {
  const response = await api.get('/admin/users', { params: { q: q || undefined, page } });
  return { users: response.data.data, meta: response.data.meta };
}

// status: 'active' | 'disabled'. Returns the user with the new status.
export async function setUserStatus(id, status) {
  const response = await api.patch(`/admin/users/${id}/status`, { status });
  return response.data.data;
}
