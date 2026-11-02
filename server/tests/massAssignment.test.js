import { beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Category from "../src/models/Category.js";
import Transaction from "../src/models/Transaction.js";
import Budget from "../src/models/Budget.js";
import RecurringRule from "../src/models/RecurringRule.js";
import Goal from "../src/models/Goal.js";
import TransactionTemplate from "../src/models/TransactionTemplate.js";
import Wallet from "../src/models/Wallet.js";
import Transfer from "../src/models/Transfer.js";
import { currentMonth } from "../src/utils/month.js";
import { api, auth, findCategory, registerUser } from "./helpers.js";

// Every route keeps only the fields it expects. Fields a client must never set (the owner, the role, the token
// version, the saved amount of a goal...) are sent along on every create and update, and must have no effect.

const MONTH = currentMonth();
const strangerId = new mongoose.Types.ObjectId().toString();
// Sent with every body below
const FORBIDDEN = {
  _id: new mongoose.Types.ObjectId().toString(),
  userId: strangerId,
  role: "admin",
  status: "disabled",
  tokenVersion: 99,
  passwordHash: "plain-text",
  isDemo: true,
  createdAt: "2001-01-01T00:00:00.000Z",
};

let user;
let food;
let salary;

function send(method, path, body) {
  return api()[method](path).set(auth(user.token)).send({ ...FORBIDDEN, ...body });
}

beforeAll(async () => {
  user = await registerUser();
  food = await findCategory(user.token, "Food");
  salary = await findCategory(user.token, "Salary");
});

// A document must belong to the user, keep its own _id and a recent createdAt
function expectOwnedAndFresh(doc) {
  expect(String(doc.userId)).toBe(String(user.user._id));
  expect(String(doc._id)).not.toBe(FORBIDDEN._id);
  expect(doc.createdAt.getFullYear()).toBeGreaterThan(2001);
}

describe("mass assignment: extra fields in a body are ignored", () => {
  it("register cannot set the role, the status, the token version, the hash or the avatar", async () => {
    const email = `mass-${Date.now()}@example.com`;
    const res = await api()
      .post("/api/auth/register")
      .send({ ...FORBIDDEN, name: "Mass", email, password: "secret123", avatar: { type: "upload", value: "data:x" } });
    expect(res.status).toBe(201);

    const saved = await User.findOne({ email }).lean();
    expect(saved).toMatchObject({ role: "user", status: "active", tokenVersion: 0 });
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(saved.avatar.type).toBe("preset");
    expect(String(saved._id)).not.toBe(FORBIDDEN._id);
  });

  it("the profile changes the name only", async () => {
    const res = await send("patch", "/api/users/me", { name: "New name", email: "other@example.com", avatar: { type: "preset", value: "cat" } });
    expect(res.status).toBe(200);
    const saved = await User.findById(user.user._id).lean();
    expect(saved).toMatchObject({ name: "New name", email: user.email, role: "user", status: "active", tokenVersion: 0 });
  });

  it("a category, a transaction, a budget and a template belong to the token's user", async () => {
    const category = await send("post", "/api/categories", { name: "Mass", type: "expense", color: "#22ADA3" });
    const transaction = await send("post", "/api/transactions", {
      categoryId: food._id,
      amount: 1000,
      type: "income", // the type comes from the category
      recurringRuleId: new mongoose.Types.ObjectId().toString(),
    });
    const budget = await send("post", "/api/budgets", { categoryId: food._id, month: MONTH, amount: 5000 });
    const template = await send("post", "/api/templates", { name: "Mass", categoryId: food._id, amount: 1000 });
    for (const res of [category, transaction, budget, template]) expect(res.status).toBe(201);

    expectOwnedAndFresh(await Category.findById(category.body.data._id).lean());
    const savedTransaction = await Transaction.findById(transaction.body.data._id).lean();
    expectOwnedAndFresh(savedTransaction);
    expect(savedTransaction.type).toBe("expense");
    expect(savedTransaction.recurringRuleId).toBeUndefined();
    expectOwnedAndFresh(await Budget.findById(budget.body.data._id).lean());
    expectOwnedAndFresh(await TransactionTemplate.findById(template.body.data._id).lean());
  });

  it("editing a transaction cannot change its owner, its type or its rule", async () => {
    const created = await send("post", "/api/transactions", { categoryId: salary._id, amount: 2000 });
    const id = created.body.data._id;
    const res = await send("patch", `/api/transactions/${id}`, {
      note: "edited",
      type: "expense",
      recurringRuleId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(200);
    const saved = await Transaction.findById(id).lean();
    expectOwnedAndFresh(saved);
    expect(saved).toMatchObject({ note: "edited", type: "income" });
    expect(saved.recurringRuleId).toBeUndefined();
  });

  it("a rule starts active, on its start date, whatever the body says", async () => {
    const res = await send("post", "/api/recurring", {
      categoryId: food._id,
      amount: 1000,
      frequency: "weekly",
      startDate: "2099-03-01",
      active: false,
      nextRunDate: "2000-01-01T00:00:00Z",
    });
    expect(res.status).toBe(201);
    const saved = await RecurringRule.findById(res.body.data._id).lean();
    expectOwnedAndFresh(saved);
    expect(saved.active).toBe(true);
    expect(saved.nextRunDate.toISOString()).toBe("2099-03-01T05:00:00.000Z");
  });

  it("a goal starts at 0 saved with no history, and editing it never changes what was saved", async () => {
    const created = await send("post", "/api/goals", {
      name: "Mass",
      targetAmount: 100000,
      color: "#4A9FE3",
      savedAmount: 999999,
      contributions: [{ amount: 999999, date: "2026-01-01" }],
    });
    expect(created.status).toBe(201);
    const id = created.body.data._id;
    expect(await Goal.findById(id).lean()).toMatchObject({ savedAmount: 0, contributions: [] });

    const edited = await send("put", `/api/goals/${id}`, { name: "Mass 2", targetAmount: 200000, color: "#4A9FE3", savedAmount: 5 });
    expect(edited.status).toBe(200);
    const saved = await Goal.findById(id).lean();
    expectOwnedAndFresh(saved);
    expect(saved.savedAmount).toBe(0);
  });

  it("a wallet is never made the default one, and the default flag cannot move", async () => {
    const created = await send("post", "/api/wallets", { name: "Mass", type: "bank", color: "#7D8CE8", isDefault: true, archived: true });
    expect(created.status).toBe(201);
    const id = created.body.data._id;
    expect(await Wallet.findById(id).lean()).toMatchObject({ isDefault: false, archived: false });

    const edited = await send("patch", `/api/wallets/${id}`, { name: "Mass 2", isDefault: true });
    expect(edited.status).toBe(200);
    const saved = await Wallet.findById(id).lean();
    expectOwnedAndFresh(saved);
    expect(saved.isDefault).toBe(false);
    expect(await Wallet.countDocuments({ userId: user.user._id, isDefault: true })).toBe(1);
  });

  it("a transfer belongs to the token's user", async () => {
    const wallets = (await api().get("/api/wallets").set(auth(user.token))).body.data;
    const [from, to] = wallets;
    const res = await send("post", "/api/transfers", { fromWalletId: from._id, toWalletId: to._id, amount: 1000 });
    expect(res.status).toBe(201);
    expectOwnedAndFresh(await Transfer.findById(res.body.data._id).lean());
  });

  it("preferences refuse a field they do not know (400) and change nothing", async () => {
    const res = await send("patch", "/api/users/me/preferences", { theme: "light" });
    expect(res.status).toBe(400);
    const saved = await User.findById(user.user._id).lean();
    expect(saved.role).toBe("user");
    expect(saved.preferences.theme).toBe("dark");
  });
});
