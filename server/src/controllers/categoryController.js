import * as categoryService from "../services/categoryService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

export async function list(req, res) {
  const data = await categoryService.listCategories(req.user.id, req.query);
  res.status(200).json({ success: true, data });
}

export async function create(req, res) {
  const data = await categoryService.createCategory(req.user.id, req.body);
  res.status(201).json({ success: true, data });
}
