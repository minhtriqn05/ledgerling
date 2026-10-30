import * as goalService from "../services/goalService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

export async function list(req, res) {
  const data = await goalService.listGoals(req.user.id);
  res.status(200).json({ success: true, data });
}

export async function getOne(req, res) {
  const data = await goalService.getGoal(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}

export async function create(req, res) {
  const data = await goalService.createGoal(req.user.id, req.body);
  res.status(201).json({ success: true, data });
}

export async function update(req, res) {
  const data = await goalService.updateGoal(req.user.id, req.params.id, req.body);
  res.status(200).json({ success: true, data });
}

export async function remove(req, res) {
  const data = await goalService.deleteGoal(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}

export async function addContribution(req, res) {
  const data = await goalService.addContribution(req.user.id, req.params.id, req.body);
  res.status(201).json({ success: true, data });
}

export async function removeContribution(req, res) {
  const data = await goalService.removeContribution(req.user.id, req.params.id, req.params.contributionId);
  res.status(200).json({ success: true, data });
}
