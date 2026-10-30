import * as transactionService from "../services/transactionService.js";

// The user always comes from the token (req.user.id, set by requireAuth).

// data stays an array (one page); meta tells the client how many pages there are
export async function list(req, res) {
  const { items, meta } = await transactionService.listTransactions(req.user.id, req.listQuery);
  res.status(200).json({ success: true, data: items, meta });
}

// A file, not JSON: the answer is the CSV text itself
export async function exportCsv(req, res) {
  const { filename, csv } = await transactionService.exportTransactions(req.user.id, req.listQuery);
  res
    .status(200)
    .set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store", // private data, do not keep it in a cache
    })
    .send(csv);
}

// 200 even when some rows were refused: the answer lists them, the good rows are saved
export async function importCsv(req, res) {
  const data = await transactionService.importTransactions(req.user.id, req.importRows, req.importErrors);
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
