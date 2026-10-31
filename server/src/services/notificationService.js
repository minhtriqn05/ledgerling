import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import { findBudgetProgress } from "./budgetService.js";
import { emitNotification } from "./realtimeService.js";
import { httpError } from "../utils/httpError.js";
import { addDays, dayStart, isoWeekKey, nextDayStart, todayInVietnam, vietnamDay } from "../utils/month.js";

const DUPLICATE_KEY = 11000;
const CURRENCY = "VND";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Which switch in User.preferences.notifications turns each type off
const PREFERENCE_OF_TYPE = {
  budget_warning: "budget",
  budget_over: "budget",
  goal_completed: "goals",
  recurring_created: "recurring",
  weekly_summary: "weekly",
};

// 12345678 -> "12,345,678" (the stored English text; the client formats numbers in the user's language)
const money = (amount) => `${Math.round(amount).toLocaleString("en-US")} VND`;

// Creates a notification, unless the user turned this type off or the same event (dedupeKey) already notified.
// Returns the notification, or null when nothing was created.
export async function notify(userId, { type, title, message, link = "", params = {}, dedupeKey }) {
  const user = await User.findById(userId).select("preferences").lean();
  // A missing switch (account made before preferences existed) counts as on, only an explicit false turns it off
  if (!user || user.preferences?.notifications?.[PREFERENCE_OF_TYPE[type]] === false) return null;

  try {
    const notification = await Notification.create({ userId, type, title, message, link, params, dedupeKey });
    emitNotification(userId, notification);
    return notification;
  } catch (err) {
    // The unique index (userId + dedupeKey) refused it: this event was already notified
    if (err.code === DUPLICATE_KEY) return null;
    throw err;
  }
}

// A notification is a side effect: if it fails, the transaction, contribution... that caused it must still succeed.
async function bestEffort(task) {
  try {
    await task();
  } catch (err) {
    console.error("Could not create a notification", err);
  }
}

// ----- events -----

// Call after an expense was created or edited. Warns once when its budget (same category, same month)
// reaches 80% and once at 100%. Only VND expenses count, like on the Budgets page.
export function notifyBudgetThresholds(userId, transaction) {
  return bestEffort(async () => {
    if (transaction.type !== "expense" || transaction.currency !== CURRENCY) return;

    const month = vietnamDay(transaction.date).slice(0, 7);
    const categoryId = transaction.categoryId?._id ?? transaction.categoryId;
    const budget = await findBudgetProgress(userId, categoryId, month);
    if (!budget || budget.status === "ok") return;

    const isOver = budget.status === "over";
    const level = isOver ? 100 : 80;
    const name = budget.category.name;
    await notify(userId, {
      type: isOver ? "budget_over" : "budget_warning",
      title: isOver ? `Over budget: ${name}` : `Budget warning: ${name}`,
      message: `${name} has used ${budget.percent}% of its ${month} budget (${money(budget.spent)} of ${money(budget.amount)}).`,
      link: `/budgets?month=${month}`,
      params: { categoryName: name, month, percent: budget.percent, spent: budget.spent, amount: budget.amount },
      dedupeKey: `budget:${budget._id}:${month}:${level}`,
    });
  });
}

// Call after a deposit. `goal` is the goal after the change, `amount` the deposit. Only the deposit that makes
// savedAmount reach the target notifies, so more deposits afterwards (or a withdrawal) do not.
export function notifyGoalCompleted(userId, goal, amount) {
  return bestEffort(async () => {
    const crossed = amount > 0 && goal.savedAmount >= goal.targetAmount && goal.savedAmount - amount < goal.targetAmount;
    if (!crossed) return;

    const contribution = goal.contributions[goal.contributions.length - 1];
    await notify(userId, {
      type: "goal_completed",
      title: `Goal reached: ${goal.name}`,
      message: `You saved ${money(goal.targetAmount)} for "${goal.name}". Well done!`,
      link: "/goals",
      params: { goalName: goal.name, targetAmount: goal.targetAmount },
      dedupeKey: `goal:${goal._id}:completed:${contribution._id}`,
    });
  });
}

// Call after processDueRules created transactions. `transactionIds` are the ids it created in this pass.
export function notifyRecurringCreated(userId, transactionIds) {
  return bestEffort(async () => {
    if (transactionIds.length === 0) return;

    const count = transactionIds.length;
    await notify(userId, {
      type: "recurring_created",
      title: "Recurring transactions added",
      message: count === 1 ? "1 recurring transaction was added." : `${count} recurring transactions were added.`,
      link: "/transactions",
      params: { count },
      dedupeKey: `recurring:${transactionIds[0]}`,
    });
  });
}

// What the user spent in the last 7 days (today included), VND only
async function loadWeekSpending(userId, today) {
  const rows = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: "expense",
        currency: CURRENCY,
        date: { $gte: dayStart(addDays(today, -6)), $lt: nextDayStart(today) },
      },
    },
    { $group: { _id: "$categoryId", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { total: -1, _id: 1 } },
  ]);

  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const count = rows.reduce((sum, row) => sum + row.count, 0);
  const top = rows[0] ? await Category.findOne({ _id: rows[0]._id, userId }).select("name").lean() : null;
  return { total, count, topCategory: top?.name ?? null };
}

// Once a week, when the notifications are listed: a summary of the last 7 days. It needs at least one transaction
// (a brand new account has nothing to summarise). There is no cron job (the free Render server sleeps),
// so listing the notifications is the moment the week is checked.
export function ensureWeeklySummary(userId) {
  return bestEffort(async () => {
    const recent = await Notification.exists({
      userId,
      type: "weekly_summary",
      createdAt: { $gte: new Date(Date.now() - WEEK_MS) },
    });
    if (recent || !(await Transaction.exists({ userId }))) return;

    const today = todayInVietnam();
    const { total, count, topCategory } = await loadWeekSpending(userId, today);
    await notify(userId, {
      type: "weekly_summary",
      title: "Your week in numbers",
      message:
        count === 0
          ? "You did not spend anything in the last 7 days."
          : `You spent ${money(total)} in ${count} transaction${count === 1 ? "" : "s"} in the last 7 days. Top category: ${topCategory}.`,
      link: "/reports",
      params: { total, count, topCategory, from: addDays(today, -6), to: today },
      dedupeKey: `weekly:${isoWeekKey(today)}`,
    });
  });
}

// ----- routes -----

// Filtering by userId as well means another user's notification looks like it does not exist (404)
function notFound() {
  return httpError(404, "Notification not found", "NOTIFICATION_NOT_FOUND");
}

// query = req.listQuery, already checked and with defaults (see validateListNotifications)
export async function listNotifications(userId, { page, limit, unread }) {
  await ensureWeeklySummary(userId);

  const filter = { userId };
  if (unread) filter.read = false;

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(filter),
  ]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function countUnread(userId) {
  return { count: await Notification.countDocuments({ userId, read: false }) };
}

export async function markRead(userId, id) {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId },
    { read: true },
    { returnDocument: "after" }
  );
  if (!notification) throw notFound();
  return notification;
}

// Returns how many notifications were unread before
export async function markAllRead(userId) {
  const result = await Notification.updateMany({ userId, read: false }, { read: true });
  return { updated: result.modifiedCount };
}

export async function deleteNotification(userId, id) {
  const notification = await Notification.findOneAndDelete({ _id: id, userId });
  if (!notification) throw notFound();
  return { _id: notification._id };
}
