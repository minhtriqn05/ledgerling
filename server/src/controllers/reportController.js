import * as reportService from "../services/reportService.js";
import * as insightService from "../services/insightService.js";

// The user always comes from the token (req.user.id, set by requireAuth).
// Every report first creates the recurring transactions that are due (see the services), so the numbers include them.

export async function monthly(req, res) {
  const data = await reportService.getMonthlyReport(req.user.id, req.query);
  res.status(200).json({ success: true, data });
}

export async function yearly(req, res) {
  const data = await reportService.getYearlyReport(req.user.id, req.query);
  res.status(200).json({ success: true, data });
}

export async function insights(req, res) {
  const data = await insightService.getInsights(req.user.id, req.query);
  res.status(200).json({ success: true, data });
}
