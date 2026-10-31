import TransactionTemplate from "../models/TransactionTemplate.js";
import Category from "../models/Category.js";
import { httpError } from "../utils/httpError.js";

// Shows the category's name, color, icon and type instead of just its id
const CATEGORY_FIELDS = "name color icon type";

// The category must belong to the same user, otherwise it looks like it does not exist (404)
async function assertOwnedCategory(userId, categoryId) {
  const category = await Category.exists({ _id: categoryId, userId });
  if (!category) throw httpError(404, "Category not found", "CATEGORY_NOT_FOUND");
}

// Filtering by userId as well means another user's template looks like it does not exist (404)
async function findOwned(userId, id) {
  const template = await TransactionTemplate.findOne({ _id: id, userId }).populate("categoryId", CATEGORY_FIELDS);
  if (!template) throw httpError(404, "Template not found", "TEMPLATE_NOT_FOUND");
  return template;
}

// Oldest first, so the chips of the quick add dialog keep their place
export async function listTemplates(userId) {
  return TransactionTemplate.find({ userId }).sort({ createdAt: 1, _id: 1 }).populate("categoryId", CATEGORY_FIELDS);
}

export async function getTemplate(userId, id) {
  return findOwned(userId, id);
}

export async function createTemplate(userId, data) {
  await assertOwnedCategory(userId, data.categoryId);
  const template = await TransactionTemplate.create({ ...data, userId });
  return template.populate("categoryId", CATEGORY_FIELDS);
}

export async function updateTemplate(userId, id, changes) {
  const template = await findOwned(userId, id);
  if (changes.categoryId !== undefined) await assertOwnedCategory(userId, changes.categoryId);

  template.set(changes);
  await template.save();
  // populate again: the category may have changed
  return template.populate("categoryId", CATEGORY_FIELDS);
}

export async function deleteTemplate(userId, id) {
  const template = await findOwned(userId, id);
  await template.deleteOne();
  return { _id: template._id };
}
