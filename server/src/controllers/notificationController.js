import * as notificationService from "../services/notificationService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

// data stays an array (one page); meta tells the client how many pages there are
export async function list(req, res) {
  const { items, meta } = await notificationService.listNotifications(req.user.id, req.listQuery);
  res.status(200).json({ success: true, data: items, meta });
}

export async function unreadCount(req, res) {
  const data = await notificationService.countUnread(req.user.id);
  res.status(200).json({ success: true, data });
}

export async function markRead(req, res) {
  const data = await notificationService.markRead(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}

export async function markAllRead(req, res) {
  const data = await notificationService.markAllRead(req.user.id);
  res.status(200).json({ success: true, data });
}

export async function remove(req, res) {
  const data = await notificationService.deleteNotification(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}
