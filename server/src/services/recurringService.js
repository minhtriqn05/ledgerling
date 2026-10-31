import RecurringRule from "../models/RecurringRule.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import { httpError } from "../utils/httpError.js";
import { dayNoon, nextDayStart, todayInVietnam, vietnamDay } from "../utils/month.js";
import { firstRunDayFrom, nextRunDay } from "../utils/recurrence.js";
import { notifyRecurringCreated } from "./notificationService.js";
import { emitDataChanged } from "./realtimeService.js";

// Shows the category's name and color instead of just its id
const CATEGORY_FIELDS = "name color icon type";
// One request creates at most this many transactions per rule. A rule with more due dates continues on the next request.
const MAX_RUNS_PER_PASS = 60;
const DUPLICATE_KEY = 11000;

// The category must belong to the same user, otherwise it looks like it does not exist (404)
async function checkOwnedCategory(userId, categoryId) {
  const category = await Category.exists({ _id: categoryId, userId });
  if (!category) throw httpError(404, "Category not found", "CATEGORY_NOT_FOUND");
}

// Filtering by userId as well means another user's rule looks like it does not exist (404)
async function findOwned(userId, id) {
  const rule = await RecurringRule.findOne({ _id: id, userId }).populate("categoryId", CATEGORY_FIELDS);
  if (!rule) throw httpError(404, "Recurring rule not found", "RULE_NOT_FOUND");
  return rule;
}

// Creates the transaction of the rule's next run and returns its id, or null when another request already created it:
// the unique index on recurringRuleId + date refuses the second one, which is exactly what we want.
async function createRunTransaction(rule) {
  try {
    const transaction = await Transaction.create({
      userId: rule.userId,
      categoryId: rule.categoryId._id,
      type: rule.categoryId.type, // copied from the category, like a normal transaction
      amount: rule.amount,
      note: rule.note,
      date: rule.nextRunDate,
      recurringRuleId: rule._id,
    });
    return transaction._id;
  } catch (err) {
    if (err.code !== DUPLICATE_KEY) throw err;
    return null;
  }
}

// Runs one rule until it has nothing due. `before` is the start of tomorrow in Vietnam time.
// Returns the ids of the transactions this call created.
async function runRule(firstRule, before) {
  let rule = firstRule;
  const created = [];

  for (let runs = 0; rule && runs < MAX_RUNS_PER_PASS; runs += 1) {
    const isDue = rule.nextRunDate < before;
    const isPastEnd = rule.endDate && rule.nextRunDate > rule.endDate;
    if (!isDue || isPastEnd || !rule.categoryId) break;

    const id = await createRunTransaction(rule);
    if (id) created.push(id);

    const next = nextRunDay(rule.frequency, vietnamDay(rule.startDate), vietnamDay(rule.nextRunDate));
    // Moves the rule only if nextRunDate is still the date we just used, so two requests can never skip a date.
    // moved is null when another request moved it first, or the rule was edited or turned off meanwhile.
    const moved = await RecurringRule.findOneAndUpdate(
      { _id: rule._id, active: true, nextRunDate: rule.nextRunDate },
      { nextRunDate: dayNoon(next) },
      { returnDocument: "after" }
    ).populate("categoryId", CATEGORY_FIELDS);

    // In that case read it again and keep going, so this request answers only when everything due has been created.
    rule = moved ?? (await RecurringRule.findOne({ _id: rule._id, active: true }).populate("categoryId", CATEGORY_FIELDS));
  }
  return created;
}

// Creates every transaction that is due up to today (Vietnam time) for the user's active rules.
// There is no cron job, because the free Render server sleeps when nobody is using it:
// the routes that show transactions call this first. It is safe to call many times at once.
export async function processDueRules(userId) {
  const before = nextDayStart(todayInVietnam());
  const rules = await RecurringRule.find({ userId, active: true, nextRunDate: { $lt: before } }).populate(
    "categoryId",
    CATEGORY_FIELDS
  );

  const created = [];
  for (const rule of rules) {
    created.push(...(await runRule(rule, before)));
  }
  // One notification for the whole pass, not one per transaction
  await notifyRecurringCreated(userId, created);
  // This runs inside GET requests, so liveChanges (routes/index.js) never hears about it
  if (created.length > 0) {
    emitDataChanged(userId, "transactions");
    emitDataChanged(userId, "recurring");
  }
}

export async function listRules(userId) {
  return RecurringRule.find({ userId })
    .sort({ active: -1, nextRunDate: 1, _id: 1 })
    .populate("categoryId", CATEGORY_FIELDS);
}

export async function createRule(userId, { startDate, endDate, ...data }) {
  await checkOwnedCategory(userId, data.categoryId);

  const start = dayNoon(startDate);
  const rule = await RecurringRule.create({
    ...data,
    userId,
    startDate: start,
    nextRunDate: start,
    endDate: endDate ? dayNoon(endDate) : null,
  });
  return rule.populate("categoryId", CATEGORY_FIELDS);
}

// The first date of the new schedule after the last transaction the rule created (startDate if it has created none).
// Without this, changing monthly to weekly would create every past week again.
async function recalculateNextRun(rule, frequency, startDay) {
  const last = await Transaction.findOne({ recurringRuleId: rule._id }).sort({ date: -1 }).select("date").lean();
  if (!last) return dayNoon(startDay);

  // nextDayStart is 00:00 of the day after the last transaction, so vietnamDay gives that day
  const dayAfterLast = vietnamDay(nextDayStart(vietnamDay(last.date)));
  return dayNoon(firstRunDayFrom(frequency, startDay, dayAfterLast));
}

// Only the rule changes: the transactions it already created stay as they are.
export async function updateRule(userId, id, { startDate, endDate, ...data }) {
  const rule = await findOwned(userId, id);
  await checkOwnedCategory(userId, data.categoryId);

  const scheduleChanged = rule.frequency !== data.frequency || vietnamDay(rule.startDate) !== startDate;
  if (scheduleChanged) {
    rule.nextRunDate = await recalculateNextRun(rule, data.frequency, startDate);
  }

  rule.set({ ...data, startDate: dayNoon(startDate), endDate: endDate ? dayNoon(endDate) : null });
  await rule.save();
  // populate again: the category may have changed
  return rule.populate("categoryId", CATEGORY_FIELDS);
}

// Turning a rule back on skips the dates that passed while it was off, so pausing does not create a pile of transactions.
export async function toggleRule(userId, id) {
  const rule = await findOwned(userId, id);
  rule.active = !rule.active;

  const today = todayInVietnam();
  if (rule.active && vietnamDay(rule.nextRunDate) < today) {
    rule.nextRunDate = dayNoon(firstRunDayFrom(rule.frequency, vietnamDay(rule.startDate), today));
  }

  await rule.save();
  return rule;
}

// The transactions the rule created stay: they are real records of the user's money
export async function deleteRule(userId, id) {
  const rule = await findOwned(userId, id);
  await rule.deleteOne();
  return { _id: rule._id };
}
