import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import User from "../src/models/User.js";
import Category from "../src/models/Category.js";
import Transaction from "../src/models/Transaction.js";
import Budget from "../src/models/Budget.js";
import RecurringRule from "../src/models/RecurringRule.js";
import Goal from "../src/models/Goal.js";
import TransactionTemplate from "../src/models/TransactionTemplate.js";
import Notification from "../src/models/Notification.js";
import Wallet from "../src/models/Wallet.js";
import Transfer from "../src/models/Transfer.js";
import { seedDemo } from "../src/services/demoSeedService.js";
import { DEMO_AVATAR, DEMO_EMAIL } from "../src/utils/demo.js";
import {
  addDays, currentMonth, dayStart, daysInMonth, nextDayStart, shiftMonth, todayInVietnam, vietnamDay,
} from "../src/utils/month.js";
import { api, auth, registerUser } from "./helpers.js";

// Phase 21: the shared demo account ("Try the demo"), its seed and the actions it may not do.
// The tests run in file order on one in-memory database: first the demo does not exist, then it is seeded.

const PASSWORD = "demo-test-secret";
const demo = () => api().post("/api/auth/demo");

describe("POST /api/auth/demo before the seed", () => {
  it("answers 503 DEMO_UNAVAILABLE when the demo account does not exist", async () => {
    const res = await demo();

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ success: false, message: "Demo account is not available", code: "DEMO_UNAVAILABLE" });
  });
});

describe("seedDemo", () => {
  it("refuses a missing or short password", async () => {
    await expect(seedDemo({})).rejects.toThrow(/at least 6 characters/);
    await expect(seedDemo({ password: "12345" })).rejects.toThrow(/at least 6 characters/);
  });

  it("makes the demo user with categories, 4 months of transactions, rules, goals, wallets, templates and notifications", async () => {
    const summary = await seedDemo({ password: PASSWORD });
    const user = await User.findOne({ email: DEMO_EMAIL });
    const userId = user._id;

    // 3 full months of 25-40 and the current month up to today
    expect(summary.transactions).toBeGreaterThanOrEqual(78);
    expect(summary.transactions).toBeLessThanOrEqual(160);
    expect(Object.keys(summary.transactionsByMonth)).toEqual([-3, -2, -1, 0].map((delta) => shiftMonth(currentMonth(), delta)));
    expect(await Category.countDocuments({ userId })).toBe(14);
    expect(await Category.countDocuments({ userId, icon: null })).toBe(0);
    expect(await RecurringRule.countDocuments({ userId })).toBe(4);
    expect(await Goal.countDocuments({ userId })).toBe(3);
    expect(await TransactionTemplate.countDocuments({ userId })).toBe(3);
    expect(await Wallet.countDocuments({ userId })).toBe(3);
    expect(await Transfer.countDocuments({ userId })).toBeGreaterThan(0);
    expect(await Notification.countDocuments({ userId })).toBeGreaterThanOrEqual(4);
    expect(user.role).toBe("user");
  });

  it("covers the last 4 months: 25-40 transactions in each full month, the current month spread up to today", async () => {
    const user = await User.findOne({ email: DEMO_EMAIL });
    const today = todayInVietnam();
    const thisMonth = currentMonth();
    const days = (await Transaction.find({ userId: user._id }).select("date")).map((t) => vietnamDay(t.date)).sort();

    // Nothing in the future, and the newest transaction is today
    expect(days.at(-1)).toBe(today);
    expect(days[0] >= `${shiftMonth(thisMonth, -3)}-01`).toBe(true);

    for (const delta of [-3, -2, -1, 0]) {
      const month = shiftMonth(thisMonth, delta);
      const inMonth = days.filter((day) => day.startsWith(month));
      if (delta < 0) {
        expect(inMonth.length, month).toBeGreaterThanOrEqual(25);
        expect(inMonth.length, month).toBeLessThanOrEqual(40);
      }
      // Spread over the month: never a week without a transaction (from the 1st up to the last day, or today)
      const last = delta < 0 ? `${month}-${String(daysInMonth(month)).padStart(2, "0")}` : today;
      const marks = [addDays(`${month}-01`, -1), ...new Set(inMonth), addDays(last, 1)];
      for (let i = 1; i < marks.length; i += 1) {
        const gap = (dayStart(marks[i]) - dayStart(marks[i - 1])) / 86400000;
        expect(gap, `${marks[i - 1]} -> ${marks[i]}`).toBeLessThanOrEqual(8);
      }
    }
  });

  it("makes Rent, Salary, Spotify and the tutoring only through the four rules, nothing written by hand", async () => {
    const user = await User.findOne({ email: DEMO_EMAIL });
    const rules = await RecurringRule.find({ userId: user._id }).populate("categoryId", "name");
    expect(rules.map((rule) => `${rule.categoryId.name}:${rule.frequency}`).sort()).toEqual([
      "Entertainment:monthly",
      "Rent:monthly",
      "Salary:monthly",
      "Tutoring:weekly",
    ]);

    // Rent is due on the 1st, the salary on the 5th: 4 months, or 3 for the salary before the 5th
    const salaryRuns = Number(todayInVietnam().slice(8)) >= 5 ? 4 : 3;
    for (const [name, runs] of [["Rent", 4], ["Salary", salaryRuns], ["Tutoring", null]]) {
      const category = await Category.findOne({ userId: user._id, name });
      const transactions = await Transaction.find({ userId: user._id, categoryId: category._id });
      if (runs) expect(transactions, name).toHaveLength(runs);
      else expect(transactions.length).toBeGreaterThanOrEqual(12);
      expect(transactions.every((transaction) => transaction.recurringRuleId)).toBe(true);
    }
  });

  it("has Food over 100% and Entertainment and Groceries between 80% and 100% in the current month", async () => {
    const token = (await demo()).body.data.token;
    const res = await api().get(`/api/budgets?month=${currentMonth()}`).set(auth(token));

    expect(res.status).toBe(200);
    const byStatus = (status) => res.body.data.filter((budget) => budget.status === status).map((budget) => budget.category.name).sort();
    expect(byStatus("over")).toEqual(["Food"]);
    expect(byStatus("warning")).toEqual(["Entertainment", "Groceries"]);
    for (const budget of res.body.data) {
      if (budget.status === "over") expect(budget.percent).toBeGreaterThanOrEqual(100);
      if (budget.status === "warning") {
        expect(budget.percent).toBeGreaterThanOrEqual(80);
        expect(budget.percent).toBeLessThan(100);
      }
      // Round amounts, like a person would set them
      expect(budget.amount % 1000).toBe(0);
    }
  });

  it("has only valid transactions: positive VND amounts, a note, the type of their category, valid tags, not in the future", async () => {
    const user = await User.findOne({ email: DEMO_EMAIL });
    const transactions = await Transaction.find({ userId: user._id }).populate("categoryId", "type");

    for (const transaction of transactions) {
      expect(transaction.amount).toBeGreaterThan(0);
      expect(Number.isInteger(transaction.amount)).toBe(true);
      expect(transaction.currency).toBe("VND");
      expect(transaction.note.length).toBeGreaterThan(0);
      expect(transaction.type).toBe(transaction.categoryId.type);
      expect(transaction.walletId).toBeTruthy();
      expect(transaction.date.getTime()).toBeLessThan(nextDayStart(todayInVietnam()).getTime());
      expect(transaction.tags.length).toBeLessThanOrEqual(5);
      for (const tag of transaction.tags) expect(tag).toMatch(/^[a-z0-9-]{1,20}$/);
    }
  });

  it("looks real: no placeholder words in any name, note or tag", async () => {
    const user = await User.findOne({ email: DEMO_EMAIL });
    const userId = user._id;
    const [categories, transactions, rules, goals, templates, wallets, transfers] = await Promise.all([
      Category.find({ userId }), Transaction.find({ userId }), RecurringRule.find({ userId }), Goal.find({ userId }),
      TransactionTemplate.find({ userId }), Wallet.find({ userId }), Transfer.find({ userId }),
    ]);
    const texts = [
      ...categories.map((c) => c.name),
      ...transactions.flatMap((t) => [t.note, ...t.tags]),
      ...rules.map((r) => r.note),
      ...goals.flatMap((g) => [g.name, ...g.contributions.map((c) => c.note)]),
      ...templates.flatMap((t) => [t.name, t.note]),
      ...wallets.map((w) => w.name),
      ...transfers.map((t) => t.note),
    ].filter(Boolean);

    const placeholder = /\b(test|testing|sample|lorem|ipsum|dummy|foo|asdf|qwerty|placeholder|fake|todo|xxx|user-?\d+|product-?\d+|item-?\d+)\b/i;
    expect(texts.filter((text) => placeholder.test(text))).toEqual([]);
    // Many different notes, not the same few repeated
    expect(new Set(transactions.map((t) => t.note)).size).toBeGreaterThanOrEqual(30);
  });

  it("gives every feature something to show: goals at different stages, tags, wallets, reports and insights", async () => {
    const token = (await demo()).body.data.token;
    const get = async (path) => (await api().get(`/api${path}`).set(auth(token))).body.data;

    const progress = (await get("/goals")).map((goal) => goal.savedAmount / goal.targetAmount).sort();
    expect(progress).toHaveLength(3);
    expect(progress[0]).toBeLessThan(0.25);
    expect(progress[1]).toBeGreaterThanOrEqual(0.25);
    expect(progress[1]).toBeLessThan(0.75);
    expect(progress[2]).toBeGreaterThanOrEqual(0.75);
    expect(progress[2]).toBeLessThan(1);

    expect((await get("/tags")).length).toBeGreaterThanOrEqual(5);
    for (const wallet of await get("/wallets")) expect(wallet.balance).toBeGreaterThan(0);

    const lastMonth = shiftMonth(currentMonth(), -1);
    const report = await get(`/reports/monthly?month=${lastMonth}`);
    expect(report.dailyExpense.filter((day) => day.total > 0).length).toBeGreaterThanOrEqual(15);
    expect((await get(`/insights?month=${lastMonth}`)).insights.length).toBeGreaterThanOrEqual(3);

    const notifications = await get("/notifications");
    expect(notifications.map((n) => n.type)).toEqual(
      expect.arrayContaining(["budget_over", "budget_warning", "recurring_created", "weekly_summary"])
    );
  });

  it("can run again without an error, and gives the same data instead of doubling it", async () => {
    const user = await User.findOne({ email: DEMO_EMAIL });
    const before = await Transaction.countDocuments({ userId: user._id });

    const summary = await seedDemo({ password: PASSWORD });
    const after = await User.findOne({ email: DEMO_EMAIL });

    expect(summary.transactions).toBe(before);
    expect(summary.categories).toBe(14);
    expect(summary.goals).toBe(3);
    expect(summary.recurringRules).toBe(4);
    expect(summary.wallets).toBe(3);
    // The same user document is kept, so a visitor who is signed in keeps the session
    expect(String(after._id)).toBe(String(user._id));
    expect(await User.countDocuments({ email: DEMO_EMAIL })).toBe(1);
  });

  it("touches only the demo user's data: other users (an admin too) keep their account and everything in it", async () => {
    const other = await registerUser({ name: "Demo User" });
    const admin = await registerUser();
    await User.updateOne({ _id: admin.user._id }, { role: "admin" });
    const category = await Category.findOne({ userId: other.user._id, type: "expense" });
    await api().post("/api/transactions").set(auth(other.token)).send({ categoryId: String(category._id), amount: 5000 });
    await api().post("/api/budgets").set(auth(other.token)).send({ categoryId: String(category._id), month: currentMonth(), amount: 100000 });
    await api().post("/api/goals").set(auth(other.token)).send({ name: "Bike", targetAmount: 3000000, color: "#4A9FE3" });
    await api().post("/api/wallets").set(auth(other.token)).send({ name: "Techcombank", type: "bank", color: "#4A9FE3" });

    const owned = async (userId) => {
      const counts = {};
      for (const model of [Category, Transaction, Budget, Goal, Wallet, RecurringRule, TransactionTemplate, Notification, Transfer]) {
        counts[model.modelName] = await model.countDocuments({ userId });
      }
      return counts;
    };
    const [otherBefore, adminBefore, usersBefore] = [await owned(other.user._id), await owned(admin.user._id), await User.countDocuments()];
    expect(otherBefore).toMatchObject({ Transaction: 1, Budget: 1, Goal: 1, Wallet: 2 });

    await seedDemo({ password: PASSWORD });

    expect(await owned(other.user._id)).toEqual(otherBefore);
    expect(await owned(admin.user._id)).toEqual(adminBefore);
    expect(await User.countDocuments()).toBe(usersBefore);
    expect((await User.findById(admin.user._id)).role).toBe("admin");
    expect((await User.findById(other.user._id)).name).toBe("Demo User");
  });

  it("sets the password to the one it was given", async () => {
    await seedDemo({ password: "another-demo-pass" });

    const wrong = await api().post("/api/auth/login").send({ email: DEMO_EMAIL, password: PASSWORD });
    const right = await api().post("/api/auth/login").send({ email: DEMO_EMAIL, password: "another-demo-pass" });
    expect(wrong.status).toBe(401);
    expect(right.status).toBe(200);
  });
});

describe("POST /api/auth/demo after the seed", () => {
  it("signs in as the demo user (200) without a body or a password", async () => {
    const res = await demo();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user).toMatchObject({ email: DEMO_EMAIL, isDemo: true });
    // The seed gives the demo account one fixed avatar
    expect(res.body.data.user.avatar).toEqual(DEMO_AVATAR);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("gives a token that opens the demo data", async () => {
    const token = (await demo()).body.data.token;
    const res = await api().get("/api/transactions?from=2000-01-01&limit=5").set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(85);
  });

  it("answers 503 for a disabled demo account", async () => {
    await User.updateOne({ email: DEMO_EMAIL }, { status: "disabled" });
    const res = await demo();
    await User.updateOne({ email: DEMO_EMAIL }, { status: "active" });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("DEMO_UNAVAILABLE");
  });

  it("shares the login limit: the 21st request in 15 minutes is refused with 429 RATE_LIMITED", async () => {
    const limited = createApp({ rateLimit: true });
    for (let i = 0; i < 20; i += 1) {
      expect((await request(limited).post("/api/auth/demo")).status).toBe(200);
    }
    const res = await request(limited).post("/api/auth/demo");

    expect(res.status).toBe(429);
    expect(res.body.code).toBe("RATE_LIMITED");
  });
});

describe("isDemo", () => {
  it("is true on /auth/me for the demo user and false for everybody else", async () => {
    const demoToken = (await demo()).body.data.token;
    const other = await registerUser();

    const demoMe = await api().get("/api/auth/me").set(auth(demoToken));
    const otherMe = await api().get("/api/auth/me").set(auth(other.token));

    expect(demoMe.body.data.isDemo).toBe(true);
    expect(otherMe.body.data.isDemo).toBe(false);
    expect(other.user.isDemo).toBe(false); // also in the answer of register
  });
});

describe("what the demo account may not do (403 DEMO_READ_ONLY)", () => {
  const expected = { success: false, message: "Not available in the demo account", code: "DEMO_READ_ONLY" };

  it("cannot change the password", async () => {
    const token = (await demo()).body.data.token;
    const res = await api()
      .patch("/api/users/me/password")
      .set(auth(token))
      .send({ currentPassword: "another-demo-pass", newPassword: "hacked-by-visitor" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual(expected);
    // The password did not change
    expect((await api().post("/api/auth/login").send({ email: DEMO_EMAIL, password: "another-demo-pass" })).status).toBe(200);
  });

  it("cannot log out of all devices (the token keeps working)", async () => {
    const token = (await demo()).body.data.token;
    const res = await api().post("/api/auth/logout-all").set(auth(token));

    expect(res.status).toBe(403);
    expect(res.body).toEqual(expected);
    expect((await api().get("/api/auth/me").set(auth(token))).status).toBe(200);
  });

  it("cannot delete the account (with the right password, or with no body)", async () => {
    const token = (await demo()).body.data.token;
    const withPassword = await api().delete("/api/users/me").set(auth(token)).send({ password: "another-demo-pass" });
    const withoutBody = await api().delete("/api/users/me").set(auth(token));

    expect(withPassword.status).toBe(403);
    expect(withPassword.body).toEqual(expected);
    expect(withoutBody.status).toBe(403);
    const user = await User.findOne({ email: DEMO_EMAIL });
    expect(user).not.toBeNull();
    expect(await Transaction.countDocuments({ userId: user._id })).toBeGreaterThan(0);
  });

  it("cannot change or remove its avatar (the same avatar for every visitor)", async () => {
    const token = (await demo()).body.data.token;
    const changed = await api().patch("/api/users/me/avatar").set(auth(token)).send({ type: "preset", value: "tiger" });
    const removed = await api().delete("/api/users/me/avatar").set(auth(token));

    expect(changed.status).toBe(403);
    expect(changed.body).toEqual(expected);
    expect(removed.status).toBe(403);
    expect(removed.body).toEqual(expected);
    expect((await api().get("/api/auth/me").set(auth(token))).body.data.avatar).toEqual(DEMO_AVATAR);
  });

  it("still needs a token for these routes (401 comes before 403)", async () => {
    expect((await api().patch("/api/users/me/password").send({})).status).toBe(401);
    expect((await api().post("/api/auth/logout-all")).status).toBe(401);
    expect((await api().delete("/api/users/me")).status).toBe(401);
    expect((await api().patch("/api/users/me/avatar").send({})).status).toBe(401);
  });

  it("can still use the rest of the app: add a transaction, change the name and the theme, export", async () => {
    const token = (await demo()).body.data.token;
    const user = await User.findOne({ email: DEMO_EMAIL });
    const category = await Category.findOne({ userId: user._id, name: "Food" });

    const created = await api().post("/api/transactions").set(auth(token)).send({ categoryId: String(category._id), amount: 25000 });
    const renamed = await api().patch("/api/users/me").set(auth(token)).send({ name: "Visitor" });
    const theme = await api().patch("/api/users/me/preferences").set(auth(token)).send({ theme: "dark" });
    const exported = await api().get("/api/users/me/export").set(auth(token));

    expect(created.status).toBe(201);
    expect(renamed.status).toBe(200);
    expect(theme.status).toBe(200);
    expect(exported.status).toBe(200);
  });

  it("does not stop a normal user from changing the password or logging out of all devices", async () => {
    const user = await registerUser();
    const changed = await api()
      .patch("/api/users/me/password")
      .set(auth(user.token))
      .send({ currentPassword: user.password, newPassword: "brand-new-pass" });
    expect(changed.status).toBe(200);

    const loggedOut = await api().post("/api/auth/logout-all").set(auth(changed.body.data.token));
    expect(loggedOut.status).toBe(200);
  });
});

describe("seeding again after a visitor used the demo", () => {
  it("starts from a clean slate: the visitor's transaction is gone and the budgets are back", async () => {
    const user = await User.findOne({ email: DEMO_EMAIL });
    const food = await Category.findOne({ userId: user._id, name: "Food" });
    expect(await Transaction.countDocuments({ userId: user._id, categoryId: food._id, amount: 25000 })).toBe(1);

    await seedDemo({ password: PASSWORD });

    const freshFood = await Category.findOne({ userId: user._id, name: "Food" });
    expect(await Transaction.countDocuments({ userId: user._id, categoryId: freshFood._id, amount: 25000 })).toBe(0);
    expect(await Budget.countDocuments({ userId: user._id, month: currentMonth() })).toBeGreaterThanOrEqual(3);
  });
});
