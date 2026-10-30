import * as recurringService from "../services/recurringService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

// Processes first, so the page never shows a "next run" date that has already passed
export async function list(req, res) {
  await recurringService.processDueRules(req.user.id);
  const data = await recurringService.listRules(req.user.id);
  res.status(200).json({ success: true, data });
}

export async function create(req, res) {
  const data = await recurringService.createRule(req.user.id, req.body);
  res.status(201).json({ success: true, data });
}

export async function update(req, res) {
  const data = await recurringService.updateRule(req.user.id, req.params.id, req.body);
  res.status(200).json({ success: true, data });
}

export async function toggle(req, res) {
  const data = await recurringService.toggleRule(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}

export async function remove(req, res) {
  const data = await recurringService.deleteRule(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}
