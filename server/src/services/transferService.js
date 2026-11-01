import Transfer from "../models/Transfer.js";
import { httpError } from "../utils/httpError.js";
import { findOwnedWallet, findUsableWallet } from "./walletService.js";

// Shows the wallet's name and color instead of just its id
const WALLET_FIELDS = "name type color archived";

const withWallets = (query) => query.populate("fromWalletId", WALLET_FIELDS).populate("toWalletId", WALLET_FIELDS);

// query = req.listQuery, already checked and with defaults (see validateListTransfers).
// Newest first; _id comes last so two transfers with the same date never jump between pages.
export async function listTransfers(userId, { walletId, page, limit }) {
  const filter = { userId };
  if (walletId) {
    await findOwnedWallet(userId, walletId);
    filter.$or = [{ fromWalletId: walletId }, { toWalletId: walletId }];
  }

  const [items, total] = await Promise.all([
    withWallets(Transfer.find(filter))
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Transfer.countDocuments(filter),
  ]);

  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function createTransfer(userId, data) {
  await Promise.all([findUsableWallet(userId, data.fromWalletId), findUsableWallet(userId, data.toWalletId)]);
  const transfer = await Transfer.create({ ...data, userId });
  return transfer.populate([
    { path: "fromWalletId", select: WALLET_FIELDS },
    { path: "toWalletId", select: WALLET_FIELDS },
  ]);
}

// Deleting a transfer puts the money back, because a balance is always worked out from what exists
export async function deleteTransfer(userId, id) {
  const transfer = await Transfer.findOne({ _id: id, userId });
  if (!transfer) throw httpError(404, "Transfer not found", "TRANSFER_NOT_FOUND");
  await transfer.deleteOne();
  return { _id: transfer._id };
}
