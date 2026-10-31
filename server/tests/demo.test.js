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
import { seedDemo } from "../src/services/demoSeedService.js";
import { DEMO_EMAIL } from "../src/utils/demo.js";
import { currentMonth } from "../src/utils/month.js";
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

  it("makes the demo user with categories, about 90 transactions, rules, goals, templates and notifications", async () => {
    const summary = await seedDemo({ password: PASSWORD });
    const user = await User.findOne({ email: DEMO_EMAIL });
    const userId = user._id;

    expect(summary.transactions).toBeGreaterThanOrEqual(85);
    expect(summary.transactions).toBeLessThanOrEqual(100);
    expect(await Category.countDocuments({ userId })).toBe(10);
    expect(await Category.countDocuments({ userId, icon: null })).toBe(0);
    expect(await RecurringRule.countDocuments({ userId })).toBe(2);
    expect(await Goal.countDocuments({ userId })).toBe(2);
    expect(await TransactionTemplate.countDocuments({ userId })).toBe(3);
    expect(await Notification.countDocuments({ userId })).toBeGreaterThanOrEqual(3);
    expect(user.role).toBe("user");
  });

  it("makes Rent and Salary only through the two monthly rules: 3 months, nothing written by hand", async () => {
    const user = await User.findOne({ email: DEMO_EMAIL });
    const rules = await RecurringRule.find({ userId: user._id }).populate("categoryId", "name");
    expect(rules.map((rule) => `${rule.categoryId.name}:${rule.frequency}`).sort()).toEqual(["Rent:monthly", "Salary:monthly"]);

    for (const name of ["Rent", "Salary"]) {
      const category = await Category.findOne({ userId: user._id, name });
      const transactions = await Transaction.find({ userId: user._id, categoryId: category._id });
      expect(transactions).toHaveLength(3);
      expect(transactions.every((transaction) => transaction.recurringRuleId)).toBe(true);
    }
  });

  it("has one budget over 100% and one between 80% and 100% in the current month", async () => {
    const token = (await demo()).body.data.token;
    const res = await api().get(`/api/budgets?month=${currentMonth()}`).set(auth(token));

    expect(res.status).toBe(200);
    const statuses = res.body.data.map((budget) => budget.status);
    expect(statuses.filter((status) => status === "over")).toHaveLength(1);
    expect(statuses.filter((status) => status === "warning")).toHaveLength(1);
    for (const budget of res.body.data) {
      if (budget.status === "over") expect(budget.percent).toBeGreaterThanOrEqual(100);
      if (budget.status === "warning") {
        expect(budget.percent).toBeGreaterThanOrEqual(80);
        expect(budget.percent).toBeLessThan(100);
      }
    }
  });

  it("has only valid transactions: positive VND amounts, a note, the type of their category, not in the future", async () => {
    const user = await User.findOne({ email: DEMO_EMAIL });
    const transactions = await Transaction.find({ userId: user._id }).populate("categoryId", "type");

    for (const transaction of transactions) {
      expect(transaction.amount).toBeGreaterThan(0);
      expect(transaction.currency).toBe("VND");
      expect(transaction.note.length).toBeGreaterThan(0);
      expect(transaction.type).toBe(transaction.categoryId.type);
      expect(transaction.date.getTime()).toBeLessThanOrEqual(Date.now() + 24 * 3600 * 1000);
    }
  });

  it("can run again without an error, and gives the same data instead of doubling it", async () => {
    const user = await User.findOne({ email: DEMO_EMAIL });
    const before = await Transaction.countDocuments({ userId: user._id });

    const summary = await seedDemo({ password: PASSWORD });
    const after = await User.findOne({ email: DEMO_EMAIL });

    expect(summary.transactions).toBe(before);
    expect(summary.categories).toBe(10);
    expect(summary.goals).toBe(2);
    expect(summary.recurringRules).toBe(2);
    // The same user document is kept, so a visitor who is signed in keeps the session
    expect(String(after._id)).toBe(String(user._id));
    expect(await User.countDocuments({ email: DEMO_EMAIL })).toBe(1);
  });

  it("touches only the demo user's data: another user keeps everything", async () => {
    const other = await registerUser();
    const category = await Category.findOne({ userId: other.user._id });
    const categories = await Category.countDocuments({ userId: other.user._id });
    await api().post("/api/transactions").set(auth(other.token)).send({ categoryId: String(category._id), amount: 5000 });

    await seedDemo({ password: PASSWORD });

    expect(await Category.countDocuments({ userId: other.user._id })).toBe(categories);
    expect(await Transaction.countDocuments({ userId: other.user._id })).toBe(1);
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

  it("still needs a token for these routes (401 comes before 403)", async () => {
    expect((await api().patch("/api/users/me/password").send({})).status).toBe(401);
    expect((await api().post("/api/auth/logout-all")).status).toBe(401);
    expect((await api().delete("/api/users/me")).status).toBe(401);
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
