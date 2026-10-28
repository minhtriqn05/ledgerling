import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import { httpError } from "../utils/httpError.js";
import { currentMonth, monthRange } from "../utils/month.js";

// Shows the category's name and color instead of just its id
const CATEGORY_FIELDS = "name color";

// The category must belong to the same user, otherwise it looks like it does not exist (404)
async function findOwnedCategory(userId, categoryId) {
  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) throw httpError(404, "Category not found");
  return category;
}

export async function listTransactions(userId, { month, type, categoryId }) {
  const { from, to } = monthRange(month ?? currentMonth());
  const filter = { userId, date: { $gte: from, $lt: to } };
  if (type) filter.type = type;
  if (categoryId) filter.categoryId = categoryId;

  return Transaction.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .populate("categoryId", CATEGORY_FIELDS);
}

// Filtering by userId as well means another user's transaction looks like it does not exist (404)
async function findOwned(userId, id) {
  const transaction = await Transaction.findOne({ _id: id, userId }).populate(
    "categoryId",
    CATEGORY_FIELDS
  );
  if (!transaction) throw httpError(404, "Transaction not found");
  return transaction;
}

export async function getTransaction(userId, id) {
  return findOwned(userId, id);
}

export async function createTransaction(userId, data) {
  const category = await findOwnedCategory(userId, data.categoryId);

  // type is copied from the category so it can never disagree with it
  const transaction = await Transaction.create({ ...data, userId, type: category.type });
  return transaction.populate("categoryId", CATEGORY_FIELDS);
}

export async function updateTransaction(userId, id, changes) {
  const transaction = await findOwned(userId, id);

  if (changes.categoryId !== undefined) {
    const category = await findOwnedCategory(userId, changes.categoryId);
    transaction.type = category.type;
  }

  transaction.set(changes);
  await transaction.save();
  // populate again: the category may have changed
  return transaction.populate("categoryId", CATEGORY_FIELDS);
}

export async function deleteTransaction(userId, id) {
  const transaction = await findOwned(userId, id);
  await transaction.deleteOne();
  return { _id: transaction._id };
}
