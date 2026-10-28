import Category from "../models/Category.js";
import { httpError } from "../utils/httpError.js";

// Same case-insensitive comparison as the unique index on the model
const NAME_COLLATION = { locale: "en", strength: 2 };

export async function listCategories(userId, { type }) {
  const filter = { userId };
  if (type) filter.type = type;
  return Category.find(filter).sort({ type: 1, name: 1 }).collation(NAME_COLLATION);
}

// Filtering by userId as well means another user's category looks like it does not exist (404)
async function findOwned(userId, id) {
  const category = await Category.findOne({ _id: id, userId });
  if (!category) throw httpError(404, "Category not found");
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
    if (duplicate) throw httpError(409, "Category already exists");
  }

  category.set(changes);
  return category.save();
}

export async function deleteCategory(userId, id) {
  const category = await findOwned(userId, id);
  // TODO (transactions feature): answer 409 "Category still has transactions" before deleting
  await category.deleteOne();
  return { _id: category._id };
}

export async function createCategory(userId, { name, type, color }) {
  // Friendly message first; the unique index is the safety net if two requests race
  const existing = await Category.findOne({ userId, type, name }).collation(NAME_COLLATION);
  if (existing) throw httpError(409, "Category already exists");

  return Category.create({ userId, name, type, color });
}
