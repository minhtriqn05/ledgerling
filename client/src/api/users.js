import api from './axios.js';

// The signed-in user's own account (see docs/api-plan.md, "Users" and "Auth").

// name -> the user with the new name
export async function updateProfile(name) {
  const response = await api.patch('/users/me', { name });
  return response.data.data;
}

// Returns { token, user }. The old token stopped working, so the caller must store the new one.
export async function changePassword(currentPassword, newPassword) {
  const response = await api.patch('/users/me/password', { currentPassword, newPassword });
  return response.data.data;
}

// Returns { token, user }: every other device is logged out, this one gets a new token.
export async function logoutAllDevices() {
  const response = await api.post('/auth/logout-all');
  return response.data.data;
}

// preferences: any of { theme, weekStartsOn, language, notifications: { budget: false } }. Returns the user.
export async function updatePreferences(preferences) {
  const response = await api.patch('/users/me/preferences', preferences);
  return response.data.data;
}

// Everything the user owns, as one object (profile, categories, transactions, budgets, recurringRules, goals, templates)
export async function exportMyData() {
  const response = await api.get('/users/me/export');
  return response.data.data;
}

// Deletes the account and all its data. Throws a 400 (WRONG_PASSWORD) for a wrong password.
export async function deleteAccount(password) {
  await api.delete('/users/me', { data: { password } });
}
