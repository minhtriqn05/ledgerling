import * as budgetService from "../services/budgetService.js";
import { processDueRules } from "../services/recurringService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

export async function list(req, res) {
  await processDueRules(req.user.id);
  const data = await budgetService.listBudgets(req.user.id, req.query);
  res.status(200).json({ success: true, data });
}

export async function create(req, res) {
  const data = await budgetService.createBudget(req.user.id, req.body);
  res.status(201).json({ success: true, data });
}

export async function copy(req, res) {
  const data = await budgetService.copyBudgets(req.user.id, req.body);
  res.status(200).json({ success: true, data });
}

export async function update(req, res) {
  const data = await budgetService.updateBudget(req.user.id, req.params.id, req.body);
  res.status(200).json({ success: true, data });
}

export async function remove(req, res) {
  const data = await budgetService.deleteBudget(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}
