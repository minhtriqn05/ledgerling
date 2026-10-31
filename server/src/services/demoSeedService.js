import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import RecurringRule from "../models/RecurringRule.js";
import Goal from "../models/Goal.js";
import TransactionTemplate from "../models/TransactionTemplate.js";
import Notification from "../models/Notification.js";
import { DEMO_AVATAR, DEMO_EMAIL, DEMO_NAME } from "../utils/demo.js";
import { addDays, currentMonth, dayNoon, shiftMonth, todayInVietnam } from "../utils/month.js";
import { processDueRules } from "./recurringService.js";
import { ensureWeeklySummary, notifyBudgetThresholds } from "./notificationService.js";

// Fills the demo account (demo@example.com) with believable data for the landing page's "Try the demo" button.
// Only the demo user's own documents are deleted and made again; nobody else's data is touched.
// Dates are relative to today (Vietnam time) and the random numbers come from a fixed seed,
// so two runs on the same day give the same data.

const SALT_ROUNDS = 10;
const OWNED_MODELS = [Transaction, Budget, RecurringRule, Goal, TransactionTemplate, Notification, Category];
// About 90 transactions in the current month and the two before it, the rules' Rent and Salary included
const TARGET_TRANSACTIONS = 90;
const RANDOM_SEED = 2026;

const CATEGORIES = [
  { name: "Food", type: "expense", color: "#F07D62", icon: "utensils" },
  { name: "Transport", type: "expense", color: "#4A9FE3", icon: "bus" },
  { name: "Shopping", type: "expense", color: "#7D8CE8", icon: "shopping-bag" },
  { name: "Bills", type: "expense", color: "#F19A52", icon: "receipt" },
  { name: "Entertainment", type: "expense", color: "#22ADA3", icon: "clapperboard" },
  { name: "Health", type: "expense", color: "#94C24F", icon: "heart-pulse" },
  { name: "Rent", type: "expense", color: "#5D7FD8", icon: "house" },
  { name: "Salary", type: "income", color: "#3DB383", icon: "banknote" },
  { name: "Freelance", type: "income", color: "#4A9FE3", icon: "briefcase" },
  { name: "Other Income", type: "income", color: "#F19A52", icon: "gift" },
];

// What the random transactions look like: how often (weight), what for (notes), how much (VND, min to max)
const SPENDING = [
  { category: "Food", weight: 34, min: 30000, max: 190000, notes: ["Lunch - com tam", "Pho bo for breakfast", "Banh mi", "Dinner with friends", "Bun cha", "Street food"] },
  { category: "Food", weight: 12, min: 35000, max: 70000, notes: ["Coffee at Highlands", "Iced milk coffee", "Matcha latte"], tags: ["work"] },
  { category: "Food", weight: 7, min: 180000, max: 480000, notes: ["Groceries at Co.opmart", "Weekly groceries at WinMart"], tags: ["family"] },
  { category: "Transport", weight: 17, min: 18000, max: 120000, notes: ["Grab ride", "Xanh SM taxi", "Bus ticket", "Petrol"] },
  { category: "Shopping", weight: 8, min: 120000, max: 950000, notes: ["New T-shirt", "Shopee order", "Phone case", "Running shoes", "Notebook and pens"] },
  { category: "Entertainment", weight: 8, min: 70000, max: 360000, notes: ["Movie tickets", "Karaoke night", "Board game cafe", "Concert ticket"], tags: ["weekend"] },
  { category: "Health", weight: 4, min: 50000, max: 260000, notes: ["Pharmacy", "Vitamins", "Dental check-up"] },
];

// Same day of every month. Amounts that differ per month are listed oldest month first.
const MONTHLY = [
  { day: 3, category: "Health", note: "Gym membership", amounts: [400000] },
  { day: 5, category: "Bills", note: "Internet - FPT", amounts: [220000] },
  { day: 10, category: "Bills", note: "Phone top-up", amounts: [100000] },
  { day: 12, category: "Entertainment", note: "Netflix", amounts: [180000] },
  { day: 15, category: "Bills", note: "Electricity bill", amounts: [690000, 850000, 780000] },
];
// One-off income, by month (0 = the oldest month)
const EXTRA_INCOME = [
  { month: 0, day: 18, category: "Freelance", note: "Freelance web project", amount: 3500000 },
  { month: 1, day: 22, category: "Freelance", note: "Logo design for a client", amount: 2000000 },
  { month: 1, day: 27, category: "Other Income", note: "Birthday gift from family", amount: 1000000 },
  { month: 2, day: 9, category: "Freelance", note: "Landing page for a cafe", amount: 2800000 },
];
// Spending on the last day of the data, so every budget below has something to measure
const TODAY_SPENDING = [
  { category: "Food", note: "Groceries at Co.opmart", amount: 420000 },
  { category: "Entertainment", note: "Movie tickets", amount: 240000 },
  { category: "Transport", note: "Grab ride", amount: 85000 },
];

// A small random number generator (mulberry32): the same seed always gives the same numbers
function createRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const roundTo = (value, step) => Math.round(value / step) * step;
const ceilTo = (value, step) => Math.ceil(value / step) * step;
const floorTo = (value, step) => Math.floor(value / step) * step;
const dayOf = (month, day) => `${month}-${String(day).padStart(2, "0")}`;

// Every day from `from` to `to`, both included
function daysBetween(from, to) {
  const days = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

function pickWeighted(items, random) {
  let roll = random() * items.reduce((sum, item) => sum + item.weight, 0);
  return items.find((item) => (roll -= item.weight) < 0) ?? items[items.length - 1];
}

// The transactions to insert, as { day, category, note, amount, tags }
function buildTransactions(months, today, random) {
  const list = [];
  const add = (item) => item.day <= today && list.push({ tags: [], ...item });

  months.forEach((month, index) => {
    for (const item of MONTHLY) {
      add({ day: dayOf(month, item.day), category: item.category, note: item.note, amount: item.amounts[index % item.amounts.length] });
    }
  });
  for (const income of EXTRA_INCOME) {
    add({ day: dayOf(months[income.month], income.day), category: income.category, note: income.note, amount: income.amount });
  }
  for (const item of TODAY_SPENDING) add({ day: today, ...item });

  // The two recurring rules (Rent and Salary) add 3 transactions each; the random ones fill the rest
  const days = daysBetween(`${months[0]}-01`, today);
  const remaining = Math.max(0, TARGET_TRANSACTIONS - list.length - 2 * months.length);
  for (let i = 0; i < remaining; i += 1) {
    const kind = pickWeighted(SPENDING, random);
    const note = kind.notes[Math.floor(random() * kind.notes.length)];
    const amount = roundTo(kind.min + random() * (kind.max - kind.min), kind.max > 200000 ? 5000 : 1000);
    const tags = kind.tags && random() < 0.3 ? kind.tags : [];
    list.push({ day: days[Math.floor(random() * days.length)], category: kind.category, note, amount, tags });
  }
  return list;
}

// Budgets for the current month, worked out from what was really spent, so the demo always shows:
// Food over 100%, Entertainment at 80-99%, and a few healthy ones
function buildBudgets(spentByCategory) {
  const spent = (name) => spentByCategory.get(name) ?? 0;
  const plans = [
    { category: "Food", amount: Math.max(50000, floorTo(spent("Food") * 0.82, 50000)) },
    { category: "Entertainment", amount: ceilTo(spent("Entertainment") / 0.9, 10000) },
    { category: "Transport", amount: ceilTo(spent("Transport") / 0.55, 50000) },
    { category: "Bills", amount: ceilTo(spent("Bills") / 0.6, 100000) },
    { category: "Shopping", amount: ceilTo(spent("Shopping") / 0.7, 100000) },
  ];
  return plans.filter((plan) => spent(plan.category) > 0);
}

// Deletes everything the demo user owns, and returns the user (made if it did not exist yet).
// The same user document is kept, so a visitor who is signed in does not lose the session.
async function resetUser(password) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.findOneAndUpdate(
    { email: DEMO_EMAIL },
    {
      $set: {
        name: DEMO_NAME,
        passwordHash,
        avatar: DEMO_AVATAR,
        role: "user",
        status: "active",
        "preferences.theme": "system",
        "preferences.weekStartsOn": "monday",
        "preferences.notifications": { budget: true, goals: true, recurring: true, weekly: true },
      },
      // The language stays the visitor's own choice
      $unset: { "preferences.language": "" },
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
  await Promise.all(OWNED_MODELS.map((model) => model.deleteMany({ userId: user._id })));
  return user;
}

// Returns a short summary of what was made. `password` becomes the demo account's password (DEMO_PASSWORD in .env).
export async function seedDemo({ password }) {
  if (typeof password !== "string" || password.length < 6) {
    throw new Error("The demo password must be at least 6 characters (DEMO_PASSWORD)");
  }

  const user = await resetUser(password);
  const userId = user._id;
  const today = todayInVietnam();
  const thisMonth = currentMonth();
  const months = [shiftMonth(thisMonth, -2), shiftMonth(thisMonth, -1), thisMonth];

  const categories = await Category.insertMany(CATEGORIES.map((category) => ({ ...category, userId })));
  const byName = new Map(categories.map((category) => [category.name, category]));
  const typeOf = (name) => byName.get(name).type;

  // Transactions
  const planned = buildTransactions(months, today, createRandom(RANDOM_SEED));
  await Transaction.insertMany(
    planned.map((item) => ({
      userId,
      categoryId: byName.get(item.category)._id,
      type: typeOf(item.category),
      amount: item.amount,
      currency: "VND",
      note: item.note,
      date: dayNoon(item.day),
      tags: item.tags,
    }))
  );

  // The two monthly rules. They make the Rent and Salary transactions themselves (processDueRules),
  // the same way the app does for any user, so none is written by hand here.
  const firstDay = `${months[0]}-01`;
  await RecurringRule.insertMany([
    { userId, categoryId: byName.get("Salary")._id, amount: 18000000, note: "Monthly salary", frequency: "monthly", startDate: dayNoon(firstDay), nextRunDate: dayNoon(firstDay) },
    { userId, categoryId: byName.get("Rent")._id, amount: 5500000, note: "Apartment rent", frequency: "monthly", startDate: dayNoon(firstDay), nextRunDate: dayNoon(firstDay) },
  ]);
  await processDueRules(userId);

  // Budgets of this month, from the spending above
  const spentByCategory = new Map();
  for (const item of planned) {
    if (item.day.startsWith(thisMonth) && typeOf(item.category) === "expense") {
      spentByCategory.set(item.category, (spentByCategory.get(item.category) ?? 0) + item.amount);
    }
  }
  const budgets = buildBudgets(spentByCategory);
  await Budget.insertMany(budgets.map((budget) => ({ userId, categoryId: byName.get(budget.category)._id, month: thisMonth, amount: budget.amount })));

  // Goals with a few deposits each (savedAmount is the sum of the deposits)
  const deposit = (daysAgo, amount, note) => ({ amount, note, date: dayNoon(addDays(today, -daysAgo)) });
  const goals = [
    {
      name: "Trip to Da Nang",
      targetAmount: 8000000,
      deadline: dayNoon(addDays(today, 75)),
      color: "#4A9FE3",
      contributions: [deposit(62, 1500000, "From the freelance project"), deposit(33, 1000000, ""), deposit(9, 1200000, "Saved from this month")],
    },
    {
      name: "Emergency fund",
      targetAmount: 30000000,
      deadline: null,
      color: "#3DB383",
      contributions: [deposit(80, 5000000, "First deposit"), deposit(48, 4000000, ""), deposit(20, 3000000, "Bonus")],
    },
  ];
  await Goal.insertMany(
    goals.map((goal) => ({ ...goal, userId, savedAmount: goal.contributions.reduce((sum, item) => sum + item.amount, 0) }))
  );

  // Templates for the transactions the demo user adds most often
  await TransactionTemplate.insertMany([
    { userId, name: "Morning coffee", categoryId: byName.get("Food")._id, amount: 45000, note: "Coffee at Highlands" },
    { userId, name: "Grab to work", categoryId: byName.get("Transport")._id, amount: 55000, note: "Grab ride" },
    { userId, name: "Gym membership", categoryId: byName.get("Health")._id, amount: 400000, note: "Gym membership" },
  ]);

  // Notifications: made by the app's own functions, so the text and the numbers are the real ones
  // (processDueRules above already made the "Recurring transactions added" one)
  for (const budget of budgets) {
    await notifyBudgetThresholds(userId, { type: "expense", currency: "VND", date: dayNoon(today), categoryId: byName.get(budget.category)._id });
  }
  await ensureWeeklySummary(userId);

  const count = (model) => model.countDocuments({ userId });
  return {
    email: DEMO_EMAIL,
    categories: await count(Category),
    transactions: await count(Transaction),
    budgets: await count(Budget),
    recurringRules: await count(RecurringRule),
    goals: await count(Goal),
    templates: await count(TransactionTemplate),
    notifications: await count(Notification),
  };
}
