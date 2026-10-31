import * as userService from "../services/userService.js";
import { disconnectUser } from "../services/realtimeService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

export async function updateProfile(req, res) {
  const data = await userService.updateProfile(req.user.id, req.body);
  res.status(200).json({ success: true, data });
}

export async function changePassword(req, res) {
  const data = await userService.changePassword(req.user.id, req.body);
  res.status(200).json({ success: true, data });
  // After the answer, so this device has its new token by the time its old socket closes
  disconnectUser(req.user.id);
}

export async function updatePreferences(req, res) {
  const data = await userService.updatePreferences(req.user.id, req.body);
  res.status(200).json({ success: true, data });
}

// The client turns "data" into a .json file the user saves
export async function exportData(req, res) {
  const data = await userService.exportData(req.user.id);
  res.status(200).json({ success: true, data });
}

export async function deleteAccount(req, res) {
  await userService.deleteAccount(req.user.id, req.body);
  res.status(200).json({ success: true, data: { deleted: true } });
  disconnectUser(req.user.id);
}
