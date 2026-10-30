import mongoose from "mongoose";
import Budget from "../models/Budget.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import { httpError } from "../utils/httpError.js";
import { currentMonth, monthRange } from "../utils/month.js";

// Shows the category's name and color instead of just its id
const CATEGORY_FIELDS = "name color";
// A budget has no currency: it is in VND, so only VND expenses count as spent
const BUDGET_CURRENCY = "VND";
// Warnings at 80% and 100% of the budget
const WARNING_PERCENT = 80;
const EXCEEDED_PERCENT = 100;

// The category must belong to the same user (otherwise 404, as if it did not exist) and be an expense category
async function findOwnedExpenseCategory(userId, categoryId) {
  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) throw httpError(404, "Category not found");
  if (category.type !== "expense") throw httpError(400, "Budgets are only for expense categories");
  return category;
}

// Filtering by userId as well means another user's budget looks like it does not exist (404)
async function findOwned(userId, id) {
  const budget = await Budget.findOne({ _id: id, userId }).populate("categoryId", CATEGORY_FIELDS);
  if (!budget) throw httpError(404, "Budget not found");
  return budget;
}

// Total VND expense of each category in the month, as a Map: category id (string) -> total.
// One aggregation for all the budgets of the month. A category without expenses is not in the Map.
async function spentByCategory(userId, month, categoryIds) {
  const { from, to } = monthRange(month);
  const totals = await Transaction.aggregate([
    {
      $match: {
        // aggregate() does not cast types like find(), so the id from the token must become an ObjectId
        userId: new mongoose.Types.ObjectId(userId),
        type: "expense",
        currency: BUDGET_CURRENCY,
        categoryId: { $in: categoryIds },
        date: { $gte: from, $lt: to },
      },
    },
    { $group: { _id: "$categoryId", total: { $sum: "$amount" } } },
  ]);
  return new Map(totals.map((t) => [String(t._id), t.total]));
}

// The budget as JSON plus how much of it is used.
// percent is rounded down, so the number shown always matches the status (99.9% is 99, still "warning").
function withProgress(budget, spent) {
  const percent = Math.floor((spent / budget.amount) * 100);
  let status = "ok";
  if (percent >= EXCEEDED_PERCENT) status = "exceeded";
  else if (percent >= WARNING_PERCENT) status = "warning";

  return { ...budget.toJSON(), spent, remaining: budget.amount - spent, percent, status };
}

// Spent of a single budget (after create or update)
async function progressOf(userId, budget) {
  const spent = await spentByCategory(userId, budget.month, [budget.categoryId._id]);
  return withProgress(budget, spent.get(String(budget.categoryId._id)) ?? 0);
}

export async function listBudgets(userId, { month = currentMonth() }) {
  const budgets = await Budget.find({ userId, month }).populate("categoryId", CATEGORY_FIELDS);
  if (budgets.length === 0) return [];

  const spent = await spentByCategory(
    userId,
    month,
    budgets.map((b) => b.categoryId._id)
  );

  return budgets
    .map((b) => withProgress(b, spent.get(String(b.categoryId._id)) ?? 0))
    .sort((a, b) => a.category.name.localeCompare(b.category.name, "en"));
}

export async function createBudget(userId, { categoryId, month, amount }) {
  await findOwnedExpenseCategory(userId, categoryId);

  // Friendly message first; the unique index is the safety net if two requests race
  const existing = await Budget.exists({ userId, categoryId, month });
  if (existing) throw httpError(409, "Budget already exists for this category and month");

  const budget = await Budget.create({ userId, categoryId, month, amount });
  await budget.populate("categoryId", CATEGORY_FIELDS);
  return progressOf(userId, budget);
}

export async function updateBudget(userId, id, { amount }) {
  const budget = await findOwned(userId, id);
  budget.amount = amount;
  await budget.save();
  return progressOf(userId, budget);
}

export async function deleteBudget(userId, id) {
  const budget = await findOwned(userId, id);
  await budget.deleteOne();
  return { _id: budget._id };
}
