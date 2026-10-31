import * as userService from "../services/userService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

export async function updatePreferences(req, res) {
  const data = await userService.updatePreferences(req.user.id, req.body);
  res.status(200).json({ success: true, data });
}
