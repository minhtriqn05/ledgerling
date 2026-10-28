import * as statsService from "../services/statsService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

export async function summary(req, res) {
  const data = await statsService.getSummary(req.user.id, req.query);
  res.status(200).json({ success: true, data });
}
