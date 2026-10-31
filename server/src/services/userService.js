import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import RecurringRule from "../models/RecurringRule.js";
import Goal from "../models/Goal.js";
import TransactionTemplate from "../models/TransactionTemplate.js";
import Notification from "../models/Notification.js";
import { signToken } from "./authService.js";
import { httpError } from "../utils/httpError.js";

const SALT_ROUNDS = 10;

// Every model that has a userId. Deleting an account must empty all of them.
const OWNED_MODELS = [Transaction, Budget, RecurringRule, Goal, TransactionTemplate, Notification, Category];

// A valid token can outlive its account (e.g. the user was deleted)
function invalidToken() {
  return httpError(401, "Not authorized, invalid token", "TOKEN_INVALID");
}

// Changes only the preferences that are sent. $set on one path each (not on the whole object),
// so a preference that is not sent keeps its value.
export async function updatePreferences(userId, { notifications = {}, ...others }) {
  const changes = {};
  for (const [key, value] of Object.entries(notifications)) {
    changes[`preferences.notifications.${key}`] = value;
  }
  for (const [key, value] of Object.entries(others)) {
    changes[`preferences.${key}`] = value;
  }

  const user = await User.findByIdAndUpdate(userId, { $set: changes }, { returnDocument: "after", runValidators: true });
  if (!user) throw invalidToken();
  return user;
}

export async function updateProfile(userId, { name }) {
  const user = await User.findByIdAndUpdate(userId, { $set: { name } }, { returnDocument: "after", runValidators: true });
  if (!user) throw invalidToken();
  return user;
}

// A wrong current password is a 400, not a 401: the client logs the user out on every 401.
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId);
  if (!user) throw invalidToken();

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw httpError(400, "Current password is incorrect", "WRONG_PASSWORD");
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  // Every other device is logged out; this one gets a new token below
  user.tokenVersion += 1;
  await user.save();

  return { token: signToken(user), user };
}

// Everything the user owns, as one JSON document the user can keep. No password hash (User.toJSON removes it).
export async function exportData(userId) {
  const user = await User.findById(userId);
  if (!user) throw invalidToken();

  // categoryId is populated so the file is readable on its own; the toJSON of each model renames it to "category"
  const withCategory = (query) => query.populate("categoryId", "name type");
  const [categories, transactions, budgets, recurringRules, goals, templates] = await Promise.all([
    Category.find({ userId }).sort({ type: 1, name: 1 }),
    withCategory(Transaction.find({ userId }).sort({ date: -1, _id: -1 })),
    withCategory(Budget.find({ userId }).sort({ month: -1 })),
    withCategory(RecurringRule.find({ userId }).sort({ nextRunDate: 1 })),
    Goal.find({ userId }).sort({ createdAt: 1 }),
    withCategory(TransactionTemplate.find({ userId }).sort({ name: 1 })),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: user,
    categories,
    transactions,
    budgets,
    recurringRules,
    goals,
    templates,
  };
}

// Deletes the user and every document that belongs to the user. The password must be sent again.
export async function deleteAccount(userId, { password }) {
  const user = await User.findById(userId);
  if (!user) throw invalidToken();

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw httpError(400, "Password is incorrect", "WRONG_PASSWORD");
  }

  await Promise.all(OWNED_MODELS.map((model) => model.deleteMany({ userId })));
  await User.deleteOne({ _id: userId });
}
