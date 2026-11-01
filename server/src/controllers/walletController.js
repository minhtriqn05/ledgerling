import * as walletService from "../services/walletService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

export async function list(req, res) {
  const data = await walletService.listWallets(req.user.id);
  res.status(200).json({ success: true, data });
}

export async function getOne(req, res) {
  const data = await walletService.getWallet(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}

export async function create(req, res) {
  const data = await walletService.createWallet(req.user.id, req.body);
  res.status(201).json({ success: true, data });
}

export async function update(req, res) {
  const data = await walletService.updateWallet(req.user.id, req.params.id, req.body);
  res.status(200).json({ success: true, data });
}

export async function remove(req, res) {
  const data = await walletService.deleteWallet(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}
