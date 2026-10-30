import * as tagService from "../services/tagService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

export async function list(req, res) {
  const data = await tagService.listTags(req.user.id);
  res.status(200).json({ success: true, data });
}
