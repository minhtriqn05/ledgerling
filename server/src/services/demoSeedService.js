import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import RecurringRule from "../models/RecurringRule.js";
import Goal from "../models/Goal.js";
import TransactionTemplate from "../models/TransactionTemplate.js";
import Notification from "../models/Notification.js";
import Wallet from "../models/Wallet.js";
import Transfer from "../models/Transfer.js";
import { DEMO_AVATAR, DEMO_EMAIL, DEMO_NAME } from "../utils/demo.js";
import { addDays, currentMonth, dayNoon, daysInMonth, monthRange, shiftMonth, todayInVietnam } from "../utils/month.js";
import { processDueRules } from "./recurringService.js";
import { ensureWeeklySummary, notifyBudgetThresholds } from "./notificationService.js";
import { ensureDefaultWallet } from "./walletService.js";

// Fills the demo account (demo@example.com) with believable data for the landing page's "Try the demo" button:
// the money of a junior developer in Ho Chi Minh City who also tutors English at the weekend.
// Only the demo user's own documents are deleted and made again; nobody else's data is touched.
// Dates are counted back from today (Vietnam time): the last 4 months, the current one up to today and never later.
// The random numbers come from a fixed seed, so two runs on the same day give the same data.

const SALT_ROUNDS = 10;
// Every collection that holds documents of a user (by userId). The User document itself is kept (see resetUser).
const OWNED_MODELS = [Transaction, Budget, RecurringRule, Goal, TransactionTemplate, Notification, Category, Wallet, Transfer];
const RANDOM_SEED = 2026;
// How many months of data, the current month included
const MONTH_COUNT = 4;

// The colors are the 8 preset colors of the category form (docs/ui-style.md), the icons come from utils/categoryIcons.js.
// There is no "Coffee" category on purpose: Quick add ("coffee 35k #work") files coffee under Food.
const CATEGORIES = [
  { name: "Food", type: "expense", color: "#F07D62", icon: "utensils" },
  { name: "Groceries", type: "expense", color: "#3DB383", icon: "shopping-basket" },
  { name: "Transport", type: "expense", color: "#4A9FE3", icon: "motorbike" },
  { name: "Rent", type: "expense", color: "#5D7FD8", icon: "house" },
  { name: "Bills", type: "expense", color: "#F19A52", icon: "zap" },
  { name: "Shopping", type: "expense", color: "#94C24F", icon: "shopping-bag" },
  { name: "Entertainment", type: "expense", color: "#4A9FE3", icon: "clapperboard" },
  { name: "Education", type: "expense", color: "#7D8CE8", icon: "graduation-cap" },
  { name: "Health", type: "expense", color: "#94C24F", icon: "heart-pulse" },
  { name: "Family", type: "expense", color: "#22ADA3", icon: "hand-coins" },
  { name: "Salary", type: "income", color: "#3DB383", icon: "banknote" },
  { name: "Tutoring", type: "income", color: "#4A9FE3", icon: "book-open" },
  { name: "Freelance", type: "income", color: "#7D8CE8", icon: "briefcase" },
  { name: "Other Income", type: "income", color: "#F19A52", icon: "coins" },
];

// The three wallets. Cash is the default wallet every user has (ensureDefaultWallet).
const WALLETS = {
  cash: { initialBalance: 1500000 },
  bank: { name: "Vietcombank", type: "bank", color: "#4A9FE3", initialBalance: 2000000 },
  momo: { name: "MoMo", type: "ewallet", color: "#7D8CE8", initialBalance: 600000 },
};

// Kinds of spending: the notes to pick from, the price (one of `prices`, or from min to max),
// the wallet it is paid from, and tags that most of them get. `weekend` is the kind used instead on a Saturday or Sunday.
const WEEKEND_COFFEE = {
  category: "Food", wallet: "momo", tags: ["friends"],
  notes: ["Weekend coffee with friends", "Study session at a cafe", "Brunch in District 1"],
  prices: [45000, 55000, 65000, 89000, 120000],
};
const COFFEE = {
  category: "Food", wallet: "momo", tags: ["work"], weekend: WEEKEND_COFFEE,
  notes: ["Iced milk coffee", "Highlands Coffee", "Phuc Long milk tea", "Salted coffee", "Coconut coffee"],
  prices: [29000, 35000, 39000, 45000, 55000],
};
// Lunch at the office is ordered and paid for the whole week on Monday
const OFFICE_LUNCH = {
  category: "Food", wallet: "cash", tags: ["work"],
  notes: ["Office lunch for the week"],
  prices: [250000, 275000, 300000],
};
const DINNER_OUT = {
  category: "Food", wallet: "cash", tags: ["friends"],
  notes: ["Hot pot with friends", "BBQ dinner with friends", "Banh xeo for dinner", "Seafood night in District 4"],
  min: 150000, max: 420000,
};
const DELIVERY = {
  category: "Food", wallet: "momo", tags: ["food"],
  notes: ["GrabFood - late dinner", "ShopeeFood - fried rice", "Milk tea delivery"],
  min: 55000, max: 135000,
};
const WEEKEND_RIDE = {
  category: "Transport", wallet: "momo", tags: ["friends"],
  notes: ["Grab to District 1", "Be ride to a friend's place"],
  prices: [34000, 42000, 48000, 56000],
};
const RIDE = {
  category: "Transport", wallet: "momo", tags: ["work"], weekend: WEEKEND_RIDE,
  notes: ["Grab bike to the office", "Grab home after work", "Be ride", "GrabCar in the rain"],
  prices: [22000, 28000, 32000, 36000, 41000, 89000],
};
const PETROL = { category: "Transport", wallet: "cash", notes: ["Petrol"], prices: [80000, 85000, 90000, 95000] };
const SHOPPING = {
  category: "Shopping", wallet: "bank",
  notes: ["Shopee - phone case", "Shampoo and laundry detergent", "Uniqlo T-shirt", "Lazada - desk mat", "New earphones"],
  min: 89000, max: 690000,
};
const FUN = {
  category: "Entertainment", wallet: "bank", tags: ["friends"],
  notes: ["CGV movie tickets", "Karaoke with friends", "Board game cafe", "Bowling night", "Live music night"],
  min: 90000, max: 360000,
};
const GROCERIES = {
  category: "Groceries", wallet: "cash", tags: ["home"],
  notes: ["Groceries at Bach Hoa Xanh", "Co.opmart weekly shop", "Fruit and vegetables at the market", "WinMart - eggs, rice and milk"],
  min: 140000, max: 520000,
};

// The everyday spending of a full month, as a deck of cards: each month gets exactly these (the current month
// its share of the days that have passed), shuffled and spread over the days, so no month looks empty or lopsided
const EVERYDAY_DECK = [COFFEE, COFFEE, COFFEE, DINNER_OUT, DINNER_OUT, RIDE, RIDE, FUN, FUN, DELIVERY, PETROL, SHOPPING];
// Together with the weekly items (groceries on Sunday, office lunch on Monday, tutoring on Saturday), the monthly bills,
// the rules and the one-off items, a full month has about 33-38 transactions and never more than 40.

// Same day of every month. Amounts that differ per month are listed oldest month first.
const MONTHLY = [
  { day: 2, category: "Health", note: "Gym membership", amounts: [450000], wallet: "bank" },
  { day: 6, category: "Education", note: "IELTS evening class", amounts: [1500000], wallet: "bank", tags: ["study"] },
  { day: 7, category: "Family", note: "Sent money to my parents", amounts: [2000000], wallet: "bank", tags: ["family"] },
  { day: 8, category: "Bills", note: "Internet - FPT", amounts: [220000], wallet: "bank" },
  { day: 10, category: "Bills", note: "Viettel mobile plan", amounts: [120000], wallet: "momo" },
  { day: 14, category: "Bills", note: "Electricity bill", amounts: [612400, 648900, 571300, 498700], wallet: "bank" },
  { day: 16, category: "Bills", note: "Water bill", amounts: [92000, 98500, 87300, 84600], wallet: "bank" },
];
// One-off items, by month (0 = the oldest month, 3 = the current one). Those after today are left out.
const ONE_OFF = [
  { month: 0, day: 12, category: "Freelance", note: "Website for a local bakery", amount: 3200000, wallet: "bank", tags: ["freelance"] },
  { month: 0, day: 21, category: "Health", note: "Dental cleaning", amount: 350000, wallet: "bank" },
  { month: 0, day: 27, category: "Entertainment", note: "Concert ticket", amount: 650000, wallet: "bank", tags: ["friends"] },
  { month: 1, day: 9, category: "Shopping", note: "Birthday gift for Mom", amount: 480000, wallet: "bank", tags: ["family"] },
  { month: 1, day: 19, category: "Shopping", note: "Running shoes", amount: 1190000, wallet: "bank" },
  { month: 1, day: 24, category: "Other Income", note: "Team performance bonus", amount: 1500000, wallet: "bank", tags: ["work"] },
  { month: 2, day: 15, category: "Freelance", note: "Landing page for a cafe", amount: 2500000, wallet: "bank", tags: ["freelance"] },
  { month: 2, day: 20, category: "Transport", note: "Motorbike oil change", amount: 180000, wallet: "cash" },
  { month: 2, day: 26, category: "Education", note: "Books at Fahasa", amount: 268000, wallet: "bank", tags: ["study"] },
  { month: 3, day: 3, category: "Shopping", note: "Mechanical keyboard", amount: 1350000, wallet: "bank", tags: ["work"] },
  { month: 3, day: 9, category: "Other Income", note: "Birthday money from my parents", amount: 1000000, wallet: "cash", tags: ["family"] },
];
// Spending of today, so the current month always reaches today and the budgets below have something to measure
const TODAY_SPENDING = [
  { category: "Food", note: "Iced milk coffee", amount: 29000, wallet: "momo", tags: ["work"] },
  { category: "Groceries", note: "Groceries at Bach Hoa Xanh", amount: 186000, wallet: "cash", tags: ["home"] },
];
// Money moved between the wallets, same day of every month
const MONTHLY_TRANSFERS = [
  { day: 5, from: "bank", to: "cash", amount: 2000000, note: "ATM withdrawal" },
  { day: 7, from: "bank", to: "momo", amount: 500000, note: "Top up MoMo" },
];

// Budgets of the current month, worked out from what was really spent, so the demo always shows Food over 100%,
// Entertainment and Groceries between 80% and 100%, and two healthy ones. target = the percent aimed at,
// min/max = the range it must stay in once the amount is rounded.
const BUDGET_PLANS = [
  { category: "Food", target: 108, min: 103, max: 118 },
  { category: "Entertainment", target: 86, min: 83, max: 92 },
  { category: "Groceries", target: 89, min: 83, max: 95 },
  { category: "Transport", target: 58, min: 40, max: 75 },
  { category: "Shopping", target: 46, min: 30, max: 70 },
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

const dayOf = (month, day) => `${month}-${String(day).padStart(2, "0")}`;
// 0 = Sunday ... 6 = Saturday
const weekdayOf = (day) => new Date(`${day}T00:00:00Z`).getUTCDay();
const isWeekend = (day) => weekdayOf(day) === 0 || weekdayOf(day) === 6;

// Every day from `from` to `to`, both included
function daysBetween(from, to) {
  const days = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

const pickOne = (list, random) => list[Math.floor(random() * list.length)];

// A shuffled copy (Fisher-Yates)
function shuffle(list, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// One transaction of a kind on a day: a note, a price rounded to 1,000 VND, and its tags most of the time
function everydayItem(baseKind, day, random) {
  const kind = baseKind.weekend && isWeekend(day) ? baseKind.weekend : baseKind;
  const amount = kind.prices ? pickOne(kind.prices, random) : Math.round((kind.min + random() * (kind.max - kind.min)) / 1000) * 1000;
  const tags = kind.tags && random() < 0.65 ? kind.tags : [];
  return { day, category: kind.category, note: pickOne(kind.notes, random), amount, wallet: kind.wallet, tags };
}

// `count` days between from and to, spread evenly: the range is cut into `count` equal parts and one day is picked in each
function spreadDays(from, to, count, random) {
  const days = daysBetween(from, to);
  return Array.from({ length: count }, (_, i) => {
    const start = Math.floor((i * days.length) / count);
    const end = Math.max(start + 1, Math.floor(((i + 1) * days.length) / count));
    return days[start + Math.floor(random() * (end - start))];
  });
}

// The transactions written by hand (the recurring rules make their own), as { day, category, note, amount, wallet, tags }
function buildTransactions(months, today, random) {
  const list = [];
  const add = (item) => item.day <= today && list.push({ tags: [], ...item });

  months.forEach((month, index) => {
    for (const item of MONTHLY) {
      add({ day: dayOf(month, item.day), category: item.category, note: item.note, amount: item.amounts[index % item.amounts.length], wallet: item.wallet, tags: item.tags ?? [] });
    }

    const isCurrent = month === today.slice(0, 7);
    const from = `${month}-01`;
    const to = isCurrent ? today : dayOf(month, daysInMonth(month));
    // Groceries every Sunday (today's groceries are in TODAY_SPENDING), office lunch every Monday
    for (const day of daysBetween(from, to)) {
      if (weekdayOf(day) === 0 && day < today) add(everydayItem(GROCERIES, day, random));
      if (weekdayOf(day) === 1) add(everydayItem(OFFICE_LUNCH, day, random));
    }
    // Everyday spending spread over the month; the current month gets its share of the days that have passed,
    // one card less at most because today's spending (TODAY_SPENDING) comes on top
    const cards = isCurrent ? EVERYDAY_DECK.length - 1 : EVERYDAY_DECK.length;
    const count = Math.min(cards, Math.round((EVERYDAY_DECK.length * daysBetween(from, to).length) / daysInMonth(month)));
    const deck = shuffle(EVERYDAY_DECK, random).slice(0, count);
    spreadDays(from, to, count, random).forEach((day, i) => add(everydayItem(deck[i], day, random)));
  });

  for (const item of ONE_OFF) add({ ...item, day: dayOf(months[item.month], item.day) });
  for (const item of TODAY_SPENDING) add({ ...item, day: today });
  return list;
}

// A round budget amount that puts `spent` at about `target` percent: the biggest step (500,000 down to 1,000)
// that still keeps the percent between min and max
function budgetAmount(spent, { target, min, max }) {
  for (const step of [500000, 100000, 50000, 10000, 1000]) {
    const amount = Math.round((spent * 100) / target / step) * step;
    const percent = amount > 0 ? (spent * 100) / amount : Infinity;
    if (percent >= min && percent < max) return amount;
  }
  return Math.max(1000, Math.round((spent * 100) / target / 1000) * 1000);
}

// What each expense category spent in the current month so far (the rules' transactions included)
async function spentThisMonth(userId, month) {
  const { from, to } = monthRange(month);
  const rows = await Transaction.aggregate([
    { $match: { userId, type: "expense", currency: "VND", date: { $gte: from, $lt: to } } },
    { $group: { _id: "$categoryId", total: { $sum: "$amount" } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.total]));
}

// The first day on or after `day` that is a Saturday
function firstSaturdayFrom(day) {
  let result = day;
  while (weekdayOf(result) !== 6) result = addDays(result, 1);
  return result;
}

// Deletes everything the demo user owns, and returns the user (made if it did not exist yet).
// Every delete is filtered by the demo user's _id, found by its fixed email, so no other account is ever touched.
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
        "preferences.theme": "dark",
        "preferences.weekStartsOn": "monday",
        "preferences.notifications": { budget: true, goals: true, recurring: true, weekly: true },
      },
      // The language stays the visitor's own choice
      $unset: { "preferences.language": "" },
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
  if (!user?._id) throw new Error("Could not find or create the demo user");
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
  // Oldest first: [3 months ago, 2 months ago, last month, this month]
  const months = Array.from({ length: MONTH_COUNT }, (_, i) => shiftMonth(thisMonth, i - (MONTH_COUNT - 1)));
  const firstDay = `${months[0]}-01`;

  const categories = await Category.insertMany(CATEGORIES.map((category) => ({ ...category, userId })));
  const byName = new Map(categories.map((category) => [category.name, category]));
  const typeOf = (name) => byName.get(name).type;

  // Wallets
  const cash = await ensureDefaultWallet(userId);
  cash.initialBalance = WALLETS.cash.initialBalance;
  await cash.save();
  const [bank, momo] = await Wallet.insertMany([{ userId, ...WALLETS.bank }, { userId, ...WALLETS.momo }]);
  const wallets = { cash, bank, momo };

  const transfers = months.flatMap((month) =>
    MONTHLY_TRANSFERS.map((item) => ({ ...item, day: dayOf(month, item.day) })).filter((item) => item.day <= today)
  );
  await Transfer.insertMany(
    transfers.map((item) => ({
      userId,
      fromWalletId: wallets[item.from]._id,
      toWalletId: wallets[item.to]._id,
      amount: item.amount,
      note: item.note,
      date: dayNoon(item.day),
    }))
  );

  // Transactions written by hand
  const planned = buildTransactions(months, today, createRandom(RANDOM_SEED));
  await Transaction.insertMany(
    planned.map((item) => ({
      userId,
      categoryId: byName.get(item.category)._id,
      walletId: wallets[item.wallet]._id,
      type: typeOf(item.category),
      amount: item.amount,
      currency: "VND",
      note: item.note,
      date: dayNoon(item.day),
      tags: item.tags,
    }))
  );

  // The four recurring rules. They make their transactions themselves (processDueRules), the same way the app
  // does for any user, so none of them is written by hand here.
  const rule = (category, amount, note, frequency, startDay) => ({
    userId, categoryId: byName.get(category)._id, amount, note, frequency, startDate: dayNoon(startDay), nextRunDate: dayNoon(startDay),
  });
  const tutoringStart = firstSaturdayFrom(firstDay);
  const [salary, rent, spotify] = await RecurringRule.insertMany([
    rule("Salary", 15500000, "Monthly salary", "monthly", dayOf(months[0], 5)),
    rule("Rent", 4200000, "Studio rent - Binh Thanh", "monthly", firstDay),
    rule("Entertainment", 59000, "Spotify Premium", "monthly", firstDay),
    rule("Tutoring", 350000, "Weekend English tutoring", "weekly", tutoringStart),
  ]);
  await processDueRules(userId);
  // A rule's transactions go to the default wallet (Cash): the tutoring is paid in cash, the others go through the bank
  await Transaction.updateMany(
    { userId, recurringRuleId: { $in: [salary._id, rent._id, spotify._id] } },
    { walletId: bank._id }
  );

  // Budgets of this month, from what was spent so far
  const spent = await spentThisMonth(userId, thisMonth);
  const budgets = BUDGET_PLANS.map((plan) => ({ plan, spent: spent.get(String(byName.get(plan.category)._id)) ?? 0 }))
    .filter((item) => item.spent > 0)
    .map(({ plan, spent: amountSpent }) => ({ category: plan.category, amount: budgetAmount(amountSpent, plan) }));
  await Budget.insertMany(budgets.map((budget) => ({ userId, categoryId: byName.get(budget.category)._id, month: thisMonth, amount: budget.amount })));

  // Savings goals at three different stages (savedAmount is the sum of the deposits)
  const deposit = (daysAgo, amount, note) => ({ amount, note, date: dayNoon(addDays(today, -daysAgo)) });
  const goals = [
    {
      name: "Trip to Da Nang",
      targetAmount: 6000000,
      deadline: dayNoon(addDays(today, 60)),
      color: "#4A9FE3",
      contributions: [deposit(98, 1500000, "From the bakery website"), deposit(66, 1200000, ""), deposit(36, 1000000, "From the cafe landing page"), deposit(8, 1500000, "Saved from this month")],
    },
    {
      name: "Emergency fund",
      targetAmount: 30000000,
      deadline: null,
      color: "#3DB383",
      contributions: [deposit(112, 4000000, "First deposit"), deposit(82, 3000000, ""), deposit(52, 3000000, ""), deposit(21, 2500000, "Part of the bonus"), deposit(4, 1000000, "")],
    },
    {
      name: "New laptop",
      targetAmount: 25000000,
      deadline: dayNoon(addDays(today, 240)),
      color: "#7D8CE8",
      contributions: [deposit(40, 2000000, "Start"), deposit(10, 1500000, "")],
    },
  ];
  await Goal.insertMany(
    goals.map((goal) => ({ ...goal, userId, savedAmount: goal.contributions.reduce((sum, item) => sum + item.amount, 0) }))
  );

  // Templates for the transactions the demo user adds most often
  await TransactionTemplate.insertMany([
    { userId, name: "Morning coffee", categoryId: byName.get("Food")._id, amount: 29000, note: "Iced milk coffee" },
    { userId, name: "Grab to work", categoryId: byName.get("Transport")._id, amount: 32000, note: "Grab bike to the office" },
    { userId, name: "Lunch near the office", categoryId: byName.get("Food")._id, amount: 45000, note: "Com tam near the office" },
  ]);

  // Notifications: made by the app's own functions, so the text and the numbers are the real ones
  // (processDueRules above already made the "Recurring transactions added" one)
  for (const budget of budgets) {
    await notifyBudgetThresholds(userId, { type: "expense", currency: "VND", date: dayNoon(today), categoryId: byName.get(budget.category)._id });
  }
  await ensureWeeklySummary(userId);

  const count = (model) => model.countDocuments({ userId });
  const transactionsByMonth = {};
  for (const month of months) {
    const { from, to } = monthRange(month);
    transactionsByMonth[month] = await Transaction.countDocuments({ userId, date: { $gte: from, $lt: to } });
  }
  return {
    email: DEMO_EMAIL,
    today,
    categories: await count(Category),
    transactions: await count(Transaction),
    transactionsByMonth,
    budgets: await count(Budget),
    recurringRules: await count(RecurringRule),
    goals: await count(Goal),
    templates: await count(TransactionTemplate),
    notifications: await count(Notification),
    wallets: await count(Wallet),
    transfers: await count(Transfer),
  };
}
