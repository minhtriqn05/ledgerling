import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import { httpError } from "../utils/httpError.js";
import { buildCsv } from "../utils/csv.js";
import { escapeRegex } from "../utils/regex.js";
import { notifyBudgetThresholds } from "./notificationService.js";
import { processDueRules } from "./recurringService.js";
import { ensureDefaultWallet, findOwnedWallet, findUsableWallet } from "./walletService.js";
import {
  currentMonth,
  dayStart,
  formatVietnamDateTime,
  monthRange,
  nextDayStart,
} from "../utils/month.js";

// Shows the category's name and color instead of just its id
const CATEGORY_FIELDS = "name color icon";
// The same for the wallet
const WALLET_FIELDS = "name type color archived";
const RELATIONS = [
  { path: "categoryId", select: CATEGORY_FIELDS },
  { path: "walletId", select: WALLET_FIELDS },
];

// A transaction saved before wallets existed has no walletId and counts in the default wallet, so the answer says that too.
// Only the answer changes, the document stays as it is. Transactions that have a wallet are returned untouched.
async function withDefaultWallet(userId, transactions) {
  if (transactions.every((t) => t.walletId)) return transactions;
  const { _id, name, type, color, archived } = await ensureDefaultWallet(userId);
  const wallet = { _id, name, type, color, archived };
  return transactions.map((t) => (t.walletId ? t : { ...t.toJSON(), wallet }));
}

// The category must belong to the same user, otherwise it looks like it does not exist (404)
async function findOwnedCategory(userId, categoryId) {
  const category = await Category.findOne({ _id: categoryId, userId }).select("type").lean();
  if (!category) throw httpError(404, "Category not found", "CATEGORY_NOT_FOUND");
  return category;
}

// _id comes last so two transactions with the same date or amount always keep the same order
// and never jump between pages
const SORTS = {
  "-date": { date: -1, createdAt: -1, _id: -1 },
  date: { date: 1, createdAt: 1, _id: 1 },
  "-amount": { amount: -1, date: -1, _id: -1 },
  amount: { amount: 1, date: -1, _id: -1 },
};

// from / to (whole days, Vietnam time) replace the month; with none of them, the current month is used
function dateFilter({ month, from, to }) {
  if (!from && !to) {
    const range = monthRange(month ?? currentMonth());
    return { $gte: range.from, $lt: range.to };
  }
  const date = {};
  if (from) date.$gte = dayStart(from);
  if (to) date.$lt = nextDayStart(to); // "to" includes the whole day
  return date;
}

// The MongoDB filter shared by the list and the export. userId always comes from the token.
// A wallet or a category of another user is a 404. The default wallet also has the transactions without a walletId
// ($in with null finds them).
async function buildFilter(userId, { type, categoryId, walletId, q, tag, ...range }) {
  const filter = { userId, date: dateFilter(range) };
  if (walletId) {
    const wallet = await findOwnedWallet(userId, walletId);
    filter.walletId = wallet.isDefault ? { $in: [wallet._id, null] } : wallet._id;
  }
  if (type) filter.type = type;
  if (categoryId) filter.categoryId = (await findOwnedCategory(userId, categoryId))._id;
  if (tag) filter.tags = tag; // matches when the tag is one of the transaction's tags
  if (q) filter.note = { $regex: escapeRegex(q), $options: "i" };
  return filter;
}

// query = req.listQuery, already checked and with defaults (see validateListTransactions).
// The recurring transactions that are due are created first, so they are in the list.
export async function listTransactions(userId, query) {
  await processDueRules(userId);
  const { sort, page, limit } = query;
  const filter = await buildFilter(userId, query);

  // One query for the page, one for the total; they run at the same time
  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(RELATIONS),
    Transaction.countDocuments(filter),
  ]);

  return { items: await withDefaultWallet(userId, items), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// A file bigger than this is cut off (the newest / first rows of the chosen sort are kept)
export const EXPORT_MAX_ROWS = 5000;

const CSV_HEADER = ["Date", "Type", "Category", "Amount", "Currency", "Note", "Tags"];

// Same filters and sort as the list, but no paging. Returns { filename, csv }.
export async function exportTransactions(userId, query) {
  const transactions = await Transaction.find(await buildFilter(userId, query))
    .sort(SORTS[query.sort])
    .limit(EXPORT_MAX_ROWS)
    .populate("categoryId", CATEGORY_FIELDS)
    .lean();

  const rows = transactions.map((t) => [
    formatVietnamDateTime(t.date),
    t.type,
    t.categoryId?.name ?? "",
    t.amount,
    t.currency,
    t.note,
    (t.tags ?? []).join(";"), // a transaction saved before tags existed has none
  ]);

  // "ledgerling-2026-10.csv" for a month, "ledgerling-2026-10-01_2026-10-31.csv" for a date range
  const period =
    query.from || query.to
      ? `${query.from ?? "start"}_${query.to ?? "end"}`
      : (query.month ?? currentMonth());

  return { filename: `ledgerling-${period}.csv`, csv: buildCsv(CSV_HEADER, rows) };
}

// Filtering by userId as well means another user's transaction looks like it does not exist (404)
async function findOwned(userId, id) {
  const transaction = await Transaction.findOne({ _id: id, userId }).populate(RELATIONS);
  if (!transaction) throw httpError(404, "Transaction not found", "TRANSACTION_NOT_FOUND");
  return transaction;
}

export async function getTransaction(userId, id) {
  const [transaction] = await withDefaultWallet(userId, [await findOwned(userId, id)]);
  return transaction;
}

export async function createTransaction(userId, data) {
  const category = await findOwnedCategory(userId, data.categoryId);
  // Every new transaction gets a wallet: the chosen one, or the default wallet when the request names none
  const wallet = data.walletId ? await findUsableWallet(userId, data.walletId) : await ensureDefaultWallet(userId);

  // type is copied from the category so it can never disagree with it
  const transaction = await Transaction.create({ ...data, userId, type: category.type, walletId: wallet._id });
  await notifyBudgetThresholds(userId, transaction);
  return transaction.populate(RELATIONS);
}

export async function updateTransaction(userId, id, changes) {
  const transaction = await findOwned(userId, id);

  if (changes.categoryId !== undefined) {
    const category = await findOwnedCategory(userId, changes.categoryId);
    transaction.type = category.type;
  }
  // Moving to another wallet needs one that takes new money. Keeping an archived wallet is fine, so the
  // note of an old transaction can still be edited.
  if (changes.walletId !== undefined && changes.walletId !== String(transaction.walletId?._id)) {
    await findUsableWallet(userId, changes.walletId);
  }

  transaction.set(changes);
  await transaction.save();
  await notifyBudgetThresholds(userId, transaction);
  // populate again: the category or the wallet may have changed
  await transaction.populate(RELATIONS);
  const [updated] = await withDefaultWallet(userId, [transaction]);
  return updated;
}

export async function deleteTransaction(userId, id) {
  const transaction = await findOwned(userId, id);
  await transaction.deleteOne();
  return { _id: transaction._id };
}

// Saves the good rows of a CSV import. `rows` are the cleaned rows from validateImportTransactions and `errors`
// the rows it already refused. A row whose category (name + type) is not one of the user's categories is
// refused here: categories are never created by an import. Only the good rows are saved.
export async function importTransactions(userId, rows, errors) {
  const categories = await Category.find({ userId }).select("name type").lean();
  const byNameAndType = new Map(categories.map((c) => [`${c.type}:${c.name.toLowerCase()}`, c]));

  // A CSV file does not name a wallet, so the rows go to the default wallet
  const wallet = rows.length > 0 ? await ensureDefaultWallet(userId) : null;
  const docs = [];
  const allErrors = [...errors];
  for (const { row, categoryName, ...data } of rows) {
    const category = byNameAndType.get(`${data.type}:${categoryName.toLowerCase()}`);
    if (!category) {
      allErrors.push({
        row,
        message: `Category "${categoryName}" (${data.type}) not found`,
        code: "IMPORT_CATEGORY_NOT_FOUND",
        params: { name: categoryName, type: data.type },
      });
      continue;
    }
    docs.push({ ...data, userId, categoryId: category._id, walletId: wallet._id });
  }

  if (docs.length > 0) await Transaction.insertMany(docs);
  allErrors.sort((a, b) => a.row - b.row);
  return { imported: docs.length, failed: allErrors.length, errors: allErrors };
}

// A bulk action is all or nothing: when one of the ids is not a transaction of the user (another user's, or one
// that does not exist), the answer is a 404 and nothing changes. Both cases get the same answer, so it never tells
// whether another user's id exists. `ids` has no duplicates (the request validation removed them).
async function assertAllOwned(userId, ids) {
  const owned = await Transaction.countDocuments({ _id: { $in: ids }, userId });
  if (owned !== ids.length) throw httpError(404, "Transaction not found", "TRANSACTION_NOT_FOUND");
}

// Deletes the listed transactions of the user. Returns how many were deleted.
export async function bulkDeleteTransactions(userId, ids) {
  await assertAllOwned(userId, ids);
  const result = await Transaction.deleteMany({ _id: { $in: ids }, userId });
  return { deleted: result.deletedCount };
}

// Moves the listed transactions of the user to another category of the user and copies the category's type to them.
// Returns how many transactions really changed: one that already has the category is left alone (and not counted),
// which also keeps its updatedAt.
export async function bulkChangeCategory(userId, ids, categoryId) {
  const category = await findOwnedCategory(userId, categoryId);
  await assertAllOwned(userId, ids);
  const result = await Transaction.updateMany(
    { _id: { $in: ids }, userId, categoryId: { $ne: category._id } },
    { $set: { categoryId: category._id, type: category.type } }
  );
  return { updated: result.modifiedCount };
}
