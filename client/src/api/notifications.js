import api from './axios.js';

// Calls to the /notifications endpoints (docs/api-plan.md, endpoints 46–50) and the notification settings (51).
// Each function returns the `data` part of the API answer ({ success: true, data }).
// When a request fails, the axios error is thrown: show it with getErrorMessage() from ./axios.js.

// One page of my notifications, newest first: { items, meta }. Each item has `_id`, `type`, `title`, `message`,
// `link`, `params`, `read` and `createdAt`. Listing also makes the weekly summary when it is due.
// options (all optional): { page, limit, unread } – unread: true = only the unread ones.
export async function getNotifications({ page = 1, limit = 20, unread = false } = {}) {
  const params = { page, limit };
  if (unread) params.unread = true;
  const response = await api.get('/notifications', { params });
  return { items: response.data.data, meta: response.data.meta };
}

// How many notifications are unread: a number. The app asks for it every minute.
export async function getUnreadCount() {
  const response = await api.get('/notifications/unread-count');
  return response.data.data.count;
}

// Returns the notification, now read.
export async function markRead(id) {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data.data;
}

// Returns { updated }: how many were unread.
export async function markAllRead() {
  const response = await api.patch('/notifications/read-all');
  return response.data.data;
}

// Returns { _id } of the deleted notification.
export async function deleteNotification(id) {
  const response = await api.delete(`/notifications/${id}`);
  return response.data.data;
}

// notifications: the switches to change, e.g. { budget: false }. Returns the user with the new preferences.
export async function updateNotificationSettings(notifications) {
  const response = await api.patch('/users/me/preferences', { notifications });
  return response.data.data;
}
