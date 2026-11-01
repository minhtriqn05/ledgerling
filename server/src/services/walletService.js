import mongoose from "mongoose";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import Transfer from "../models/Transfer.js";
import { httpError } from "../utils/httpError.js";

// Same case-insensitive comparison as the unique index on the model
const NAME_COLLATION = { locale: "en", strength: 2 };
const DUPLICATE_KEY = 11000;
// A wallet holds VND, so 10 USD is never added as 10 VND (like the stats)
const WALLET_CURRENCY = "VND";

const DEFAULT_WALLET = { name: "Cash", type: "cash", color: "#3DB383", isDefault: true };

// Returns the user's Cash wallet, and creates it the first time. Made on demand and not at sign-up,
// so an account from before wallets existed gets one too. Safe to call many times at once: the unique index
// refuses the second one, and that request then reads the wallet the first one made.
export async function ensureDefaultWallet(userId) {
  const wallet = await Wallet.findOne({ userId, isDefault: true });
  if (wallet) return wallet;
  try {
    return await Wallet.create({ ...DEFAULT_WALLET, userId });
  } catch (err) {
    if (err.code !== DUPLICATE_KEY) throw err;
    return Wallet.findOne({ userId, isDefault: true });
  }
}

// Filtering by userId as well means another user's wallet looks like it does not exist (404)
export async function findOwnedWallet(userId, id) {
  const wallet = await Wallet.findOne({ _id: id, userId });
  if (!wallet) throw httpError(404, "Wallet not found", "WALLET_NOT_FOUND");
  return wallet;
}

// A wallet that can take new money: it must be the user's and not archived
export async function findUsableWallet(userId, id) {
  const wallet = await findOwnedWallet(userId, id);
  if (wallet.archived) throw httpError(409, "Wallet is archived", "WALLET_ARCHIVED");
  return wallet;
}

// The totals of every wallet of the user, as a Map from wallet id to { income, expense, transfersIn, transfersOut }.
// A transaction saved before wallets existed has no walletId: $ifNull counts it in the default wallet. Nothing is written.
async function loadTotals(userId, defaultWalletId) {
  // Unlike find(), aggregate() does not cast types: the id from the token is a string and must become an ObjectId
  const owner = new mongoose.Types.ObjectId(userId);
  const sumBy = (field) => [{ $match: { userId: owner } }, { $group: { _id: field, total: { $sum: "$amount" } } }];

  const [transactions, transfersOut, transfersIn] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: owner, currency: WALLET_CURRENCY } },
      {
        $group: {
          _id: { $ifNull: ["$walletId", defaultWalletId] },
          income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
          expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
        },
      },
    ]),
    Transfer.aggregate(sumBy("$fromWalletId")),
    Transfer.aggregate(sumBy("$toWalletId")),
  ]);

  const totals = new Map();
  const totalsOf = (id) => {
    const key = String(id);
    if (!totals.has(key)) totals.set(key, { income: 0, expense: 0, transfersIn: 0, transfersOut: 0 });
    return totals.get(key);
  };
  for (const row of transactions) Object.assign(totalsOf(row._id), { income: row.income, expense: row.expense });
  for (const row of transfersOut) totalsOf(row._id).transfersOut = row.total;
  for (const row of transfersIn) totalsOf(row._id).transfersIn = row.total;
  return totals;
}

// The wallet as the API returns it: the document plus its totals and balance
function withBalance(wallet, totals) {
  const { income, expense, transfersIn, transfersOut } = totals.get(String(wallet._id)) ?? {
    income: 0,
    expense: 0,
    transfersIn: 0,
    transfersOut: 0,
  };
  return {
    ...wallet.toJSON(),
    income,
    expense,
    transfersIn,
    transfersOut,
    balance: wallet.initialBalance + income - expense + transfersIn - transfersOut,
  };
}

// Wallets in use first, the default wallet at the top, then oldest first
export async function listWallets(userId) {
  const defaultWallet = await ensureDefaultWallet(userId);
  const [wallets, totals] = await Promise.all([
    Wallet.find({ userId }).sort({ archived: 1, isDefault: -1, createdAt: 1, _id: 1 }),
    loadTotals(userId, defaultWallet._id),
  ]);
  return wallets.map((wallet) => withBalance(wallet, totals));
}

export async function getWallet(userId, id) {
  const wallet = await findOwnedWallet(userId, id);
  const defaultWallet = await ensureDefaultWallet(userId);
  return withBalance(wallet, await loadTotals(userId, defaultWallet._id));
}

export async function createWallet(userId, data) {
  // The default wallet comes first, so the first wallet a user makes can never be left without one
  await ensureDefaultWallet(userId);

  // Friendly message first; the unique index is the safety net if two requests race
  const existing = await Wallet.findOne({ userId, name: data.name }).collation(NAME_COLLATION);
  if (existing) throw httpError(409, "Wallet already exists", "WALLET_EXISTS");

  const wallet = await Wallet.create({ ...data, userId });
  return getWallet(userId, wallet._id);
}

export async function updateWallet(userId, id, changes) {
  const wallet = await findOwnedWallet(userId, id);

  if (changes.archived && wallet.isDefault) {
    throw httpError(409, "The default wallet cannot be archived", "WALLET_DEFAULT_LOCKED");
  }
  if (changes.name !== undefined) {
    // Another wallet (not this one) with the same name
    const duplicate = await Wallet.findOne({ userId, name: changes.name, _id: { $ne: wallet._id } }).collation(NAME_COLLATION);
    if (duplicate) throw httpError(409, "Wallet already exists", "WALLET_EXISTS");
  }

  wallet.set(changes);
  await wallet.save();
  return getWallet(userId, wallet._id);
}

// A wallet with a history cannot be deleted, because the balances of the others would be wrong: it can be archived.
export async function deleteWallet(userId, id) {
  const wallet = await findOwnedWallet(userId, id);
  if (wallet.isDefault) throw httpError(409, "The default wallet cannot be deleted", "WALLET_DEFAULT_LOCKED");

  const [hasTransaction, hasTransfer] = await Promise.all([
    Transaction.exists({ userId, walletId: wallet._id }),
    Transfer.exists({ userId, $or: [{ fromWalletId: wallet._id }, { toWalletId: wallet._id }] }),
  ]);
  if (hasTransaction || hasTransfer) throw httpError(409, "Wallet still has transactions or transfers", "WALLET_IN_USE");

  await wallet.deleteOne();
  return { _id: wallet._id };
}
