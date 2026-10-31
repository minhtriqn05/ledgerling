import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import RecurringRule from "../models/RecurringRule.js";
import TransactionTemplate from "../models/TransactionTemplate.js";
import { httpError } from "../utils/httpError.js";

// Same case-insensitive comparison as the unique index on the model
const NAME_COLLATION = { locale: "en", strength: 2 };

// Created for every new account. Colors are the presets from docs/ui-style.md (one per category).
const DEFAULT_CATEGORIES = [
  { name: "Food", type: "expense", color: "#F07D62", icon: "utensils" },
  { name: "Transport", type: "expense", color: "#4A9FE3", icon: "bus" },
  { name: "Shopping", type: "expense", color: "#7D8CE8", icon: "shopping-bag" },
  { name: "Bills", type: "expense", color: "#F19A52", icon: "receipt" },
  { name: "Entertainment", type: "expense", color: "#22ADA3", icon: "clapperboard" },
  { name: "Salary", type: "income", color: "#3DB383", icon: "banknote" },
  { name: "Other Income", type: "income", color: "#5D7FD8", icon: "gift" },
];

export async function createDefaultCategories(userId) {
  return Category.insertMany(DEFAULT_CATEGORIES.map((category) => ({ ...category, userId })));
}

export async function listCategories(userId, { type }) {
  const filter = { userId };
  if (type) filter.type = type;
  return Category.find(filter).sort({ type: 1, name: 1 }).collation(NAME_COLLATION);
}

// Filtering by userId as well means another user's category looks like it does not exist (404)
async function findOwned(userId, id) {
  const category = await Category.findOne({ _id: id, userId });
  if (!category) throw httpError(404, "Category not found", "CATEGORY_NOT_FOUND");
  return category;
}

export async function getCategory(userId, id) {
  return findOwned(userId, id);
}

export async function updateCategory(userId, id, changes) {
  const category = await findOwned(userId, id);

  if (changes.name !== undefined) {
    // Another category (not this one) with the same name and type
    const duplicate = await Category.findOne({
      userId,
      type: category.type,
      name: changes.name,
      _id: { $ne: category._id },
    }).collation(NAME_COLLATION);
    if (duplicate) throw httpError(409, "Category already exists", "CATEGORY_EXISTS");
  }

  category.set(changes);
  return category.save();
}

export async function deleteCategory(userId, id) {
  const category = await findOwned(userId, id);
  const inUse = await Transaction.exists({ userId, categoryId: category._id });
  if (inUse) throw httpError(409, "Category still has transactions", "CATEGORY_IN_USE");
  const hasRule = await RecurringRule.exists({ userId, categoryId: category._id });
  if (hasRule) throw httpError(409, "Category still has recurring rules", "CATEGORY_HAS_RULES");

  // A budget or a template means nothing without its category, so they go too
  await Budget.deleteMany({ userId, categoryId: category._id });
  await TransactionTemplate.deleteMany({ userId, categoryId: category._id });
  await category.deleteOne();
  return { _id: category._id };
}

export async function createCategory(userId, { name, type, color, icon }) {
  // Friendly message first; the unique index is the safety net if two requests race
  const existing = await Category.findOne({ userId, type, name }).collation(NAME_COLLATION);
  if (existing) throw httpError(409, "Category already exists", "CATEGORY_EXISTS");

  return Category.create({ userId, name, type, color, icon: icon ?? null });
}
