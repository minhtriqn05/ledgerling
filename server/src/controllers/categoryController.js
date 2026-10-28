import * as categoryService from "../services/categoryService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

export async function list(req, res) {
  const data = await categoryService.listCategories(req.user.id, req.query);
  res.status(200).json({ success: true, data });
}

export async function getOne(req, res) {
  const data = await categoryService.getCategory(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}

export async function update(req, res) {
  const data = await categoryService.updateCategory(req.user.id, req.params.id, req.body);
  res.status(200).json({ success: true, data });
}

export async function remove(req, res) {
  const data = await categoryService.deleteCategory(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}

export async function create(req, res) {
  const data = await categoryService.createCategory(req.user.id, req.body);
  res.status(201).json({ success: true, data });
}
