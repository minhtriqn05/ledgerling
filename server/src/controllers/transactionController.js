import * as transactionService from "../services/transactionService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

export async function list(req, res) {
  const data = await transactionService.listTransactions(req.user.id, req.query);
  res.status(200).json({ success: true, data });
}

export async function getOne(req, res) {
  const data = await transactionService.getTransaction(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}

export async function create(req, res) {
  const data = await transactionService.createTransaction(req.user.id, req.body);
  res.status(201).json({ success: true, data });
}

export async function update(req, res) {
  const data = await transactionService.updateTransaction(req.user.id, req.params.id, req.body);
  res.status(200).json({ success: true, data });
}

export async function remove(req, res) {
  const data = await transactionService.deleteTransaction(req.user.id, req.params.id);
  res.status(200).json({ success: true, data });
}
