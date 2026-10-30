import * as statsService from "../services/statsService.js";
import { processDueRules } from "../services/recurringService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

export async function summary(req, res) {
  await processDueRules(req.user.id);
  const data = await statsService.getSummary(req.user.id, req.query);
  res.status(200).json({ success: true, data });
}
