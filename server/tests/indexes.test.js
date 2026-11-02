import { beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
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
import { monthRange } from "../src/utils/month.js";

// Every main query of the services (same filter and sort) must be answered from an index, never by reading the whole
// collection (COLLSCAN). MongoDB's query planner says which plan it picked: explain().

const userId = new mongoose.Types.ObjectId();
const otherId = new mongoose.Types.ObjectId();
const { from, to } = monthRange("2026-10");
const NAME_COLLATION = { locale: "en", strength: 2 };

// The stages of the winning plan, e.g. ["FETCH", "IXSCAN"]
function stagesOf(plan) {
  const stages = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.stage) stages.push(node.stage);
    for (const value of Object.values(node)) if (typeof value === "object") walk(value);
  };
  walk(plan);
  return stages;
}

const findPlan = async (query) => stagesOf((await query.explain("queryPlanner")).queryPlanner.winningPlan);
async function aggregatePlan(model, pipeline) {
  const explained = await model.aggregate(pipeline).explain("queryPlanner");
  // A pipeline that starts with $match puts its query plan in the first stage ($cursor), or at the top level
  const planner = explained.stages?.[0]?.$cursor?.queryPlanner ?? explained.queryPlanner;
  return stagesOf(planner.winningPlan);
}

beforeAll(async () => {
  // A little data for two users, so the planner has something to choose from
  const categoryId = new mongoose.Types.ObjectId();
  const walletId = new mongoose.Types.ObjectId();
  const docs = [];
  for (const owner of [userId, otherId]) {
    for (let i = 0; i < 30; i += 1) {
      docs.push({ userId: owner, categoryId, walletId, type: "expense", amount: 1000 + i, date: new Date(from.getTime() + i * 3600000), tags: ["work"] });
    }
  }
  await Transaction.insertMany(docs);
  await Category.create({ userId, name: "Food", type: "expense", color: "#000000" });
  await User.create({ name: "Index", email: "index@example.com", passwordHash: "x" });
});

describe("main queries use an index", () => {
  const cases = () => [
    ["login: user by email", User.findOne({ email: "index@example.com" })],
    ["transaction list of a month", Transaction.find({ userId, date: { $gte: from, $lt: to } }).sort({ date: -1, createdAt: -1, _id: -1 })],
    ["transaction list by category", Transaction.find({ userId, categoryId: userId, date: { $gte: from, $lt: to } })],
    ["transaction list by wallet", Transaction.find({ userId, walletId: { $in: [userId, null] }, date: { $gte: from, $lt: to } })],
    ["transaction list by tag", Transaction.find({ userId, tags: "work", date: { $gte: from, $lt: to } })],
    ["category in use", Transaction.findOne({ userId, categoryId: userId })],
    ["last transaction of a rule", Transaction.findOne({ recurringRuleId: userId }).sort({ date: -1 })],
    ["categories", Category.find({ userId }).sort({ type: 1, name: 1 }).collation(NAME_COLLATION)],
    ["category name taken", Category.findOne({ userId, type: "expense", name: "food" }).collation(NAME_COLLATION)],
    ["budgets of a month", Budget.find({ userId, month: "2026-10" })],
    ["budget of a category", Budget.findOne({ userId, categoryId: userId, month: "2026-10" })],
    ["due recurring rules", RecurringRule.find({ userId, active: true, nextRunDate: { $lt: to } })],
    ["rules of a category", RecurringRule.findOne({ userId, categoryId: userId })],
    ["goals", Goal.find({ userId })],
    ["templates", TransactionTemplate.find({ userId }).sort({ createdAt: 1, _id: 1 })],
    ["notifications", Notification.find({ userId }).sort({ createdAt: -1, _id: -1 })],
    ["unread notifications", Notification.find({ userId, read: false }).sort({ createdAt: -1, _id: -1 })],
    ["last weekly summary", Notification.findOne({ userId, type: "weekly_summary", createdAt: { $gte: from } })],
    ["wallets", Wallet.find({ userId }).sort({ archived: 1, isDefault: -1, createdAt: 1, _id: 1 })],
    ["default wallet", Wallet.findOne({ userId, isDefault: true })],
    ["transfers", Transfer.find({ userId }).sort({ date: -1, createdAt: -1, _id: -1 })],
    ["transfers of a wallet", Transfer.find({ userId, $or: [{ fromWalletId: userId }, { toWalletId: userId }] })],
    ["admin: newest users", User.find({}).sort({ createdAt: -1, _id: -1 }).limit(10)],
    ["admin: users active in 7 days", Transaction.find({ createdAt: { $gte: from } }).select("userId")],
  ];

  it("every find of the services", async () => {
    const scans = [];
    for (const [label, query] of cases()) {
      const stages = await findPlan(query);
      if (stages.includes("COLLSCAN")) scans.push(label);
    }
    expect(scans).toEqual([]);
  });

  it("every aggregation of the services", async () => {
    const owner = { userId };
    const pipelines = [
      ["stats / reports of a month", Transaction, [{ $match: { ...owner, currency: "VND", date: { $gte: from, $lt: to } } }, { $group: { _id: "$type", total: { $sum: "$amount" } } }]],
      ["budget spending", Transaction, [{ $match: { ...owner, type: "expense", currency: "VND", categoryId: { $in: [userId] }, date: { $gte: from, $lt: to } } }, { $group: { _id: "$categoryId", total: { $sum: "$amount" } } }]],
      ["tags", Transaction, [{ $match: owner }, { $unwind: "$tags" }, { $group: { _id: "$tags", count: { $sum: 1 } } }]],
      ["wallet balances", Transaction, [{ $match: { ...owner, currency: "VND" } }, { $group: { _id: "$walletId", total: { $sum: "$amount" } } }]],
      ["transfers out", Transfer, [{ $match: owner }, { $group: { _id: "$fromWalletId", total: { $sum: "$amount" } } }]],
      ["admin: transactions per day", Transaction, [{ $match: { createdAt: { $gte: from, $lt: to } } }, { $group: { _id: null, count: { $sum: 1 } } }]],
      ["admin: users per day", User, [{ $match: { createdAt: { $gte: from, $lt: to } } }, { $group: { _id: null, count: { $sum: 1 } } }]],
    ];
    const scans = [];
    for (const [label, model, pipeline] of pipelines) {
      const stages = await aggregatePlan(model, pipeline);
      if (stages.includes("COLLSCAN")) scans.push(label);
    }
    expect(scans).toEqual([]);
  });
});
