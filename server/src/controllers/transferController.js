import * as transferService from "../services/transferService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

// data stays an array (one page); meta tells the client how many pages there are
export async function list(req, res) {
  const { items, meta } = await transferService.listTransfers(req.user.id, req.listQuery);
  res.status(200).json({ success: true, data: items, meta });
}

export async function create(req, res) {
  const data = await transferService.createTransfer(req.user.id, req.body);
  res.status(201).json({ success: true, data });
}

export async function remove(req, res) {
  const data = await transferService.deleteTransfer(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}
