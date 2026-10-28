import Category from "../models/Category.js";
import { httpError } from "../utils/httpError.js";

// Same case-insensitive comparison as the unique index on the model
const NAME_COLLATION = { locale: "en", strength: 2 };

export async function listCategories(userId, { type }) {
  const filter = { userId };
  if (type) filter.type = type;
  return Category.find(filter).sort({ type: 1, name: 1 }).collation(NAME_COLLATION);
}

export async function createCategory(userId, { name, type, color }) {
  // Friendly message first; the unique index is the safety net if two requests race
  const existing = await Category.findOne({ userId, type, name }).collation(NAME_COLLATION);
  if (existing) throw httpError(409, "Category already exists");

  return Category.create({ userId, name, type, color });
}
