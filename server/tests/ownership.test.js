import { beforeAll, describe, expect, it } from "vitest";
import Notification from "../src/models/Notification.js";
import { currentMonth } from "../src/utils/month.js";
import { api, auth, findCategory, registerUser } from "./helpers.js";

// One table for every route that takes an id: user A (the intruder) uses the ids of user B (the owner) in the address,
// in the body and in the query. Every attempt must be a 404, as if the item did not exist, and B's data must not change.

const MONTH = currentMonth();

let owner; // B
let intruder; // A
const theirs = {}; // ids of B's documents
const mine = {}; // ids of A's own documents, used to point at B's data from A's side

function send(token, method, path, body) {
  const req = api()[method](path).set(auth(token));
  return body === undefined ? req : req.send(body);
}

async function create(token, path, body) {
  const res = await send(token, "post", path, body);
  expect(res.status, `${path}: ${res.body.message}`).toBe(201);
  return res.body.data;
}

// Everything B owns, read with B's own token: compared before and after the attacks
async function snapshotOf(user) {
  const read = async (path) => (await send(user.token, "get", path)).body.data;
  return {
    categories: await read("/api/categories"),
    transactions: await read(`/api/transactions?month=${MONTH}`),
    budgets: await read(`/api/budgets?month=${MONTH}`),
    recurring: await read("/api/recurring"),
    goal: await read(`/api/goals/${theirs.goal}`),
    templates: await read("/api/templates"),
    wallets: await read("/api/wallets"),
    transfers: await read("/api/transfers"),
    notification: await Notification.findById(theirs.notification).lean(),
  };
}

beforeAll(async () => {
  owner = await registerUser();
  intruder = await registerUser();

  // B's documents, one of each kind
  const food = await findCategory(owner.token, "Food");
  theirs.foodCategory = food._id;
  theirs.category = (await create(owner.token, "/api/categories", { name: "Pets", type: "expense", color: "#22ADA3" }))._id;
  theirs.wallet = (await create(owner.token, "/api/wallets", { name: "Bank", type: "bank", color: "#4A9FE3" }))._id;
  const wallets = (await send(owner.token, "get", "/api/wallets")).body.data;
  theirs.defaultWallet = wallets.find((w) => w.isDefault)._id;
  theirs.transaction = (await create(owner.token, "/api/transactions", { categoryId: food._id, amount: 50000, tags: ["owner-tag"] }))._id;
  theirs.budget = (await create(owner.token, "/api/budgets", { categoryId: theirs.category, month: MONTH, amount: 900000 }))._id;
  theirs.rule = (await create(owner.token, "/api/recurring", {
    categoryId: food._id,
    amount: 30000,
    frequency: "monthly",
    startDate: "2099-01-15",
  }))._id;
  const goal = await create(owner.token, "/api/goals", { name: "Trip", targetAmount: 5000000, color: "#F19A52" });
  theirs.goal = goal._id;
  const funded = await create(owner.token, `/api/goals/${goal._id}/contributions`, { amount: 100000 });
  theirs.contribution = funded.contributions[0]._id;
  theirs.template = (await create(owner.token, "/api/templates", { name: "Coffee", categoryId: food._id, amount: 35000 }))._id;
  theirs.transfer = (await create(owner.token, "/api/transfers", {
    fromWalletId: theirs.defaultWallet,
    toWalletId: theirs.wallet,
    amount: 10000,
  }))._id;
  theirs.notification = (await Notification.create({
    userId: owner.user._id,
    type: "weekly_summary",
    title: "Your week in numbers",
    message: "You spent 50,000 VND.",
    dedupeKey: "ownership-test",
  }))._id;

  // A's own documents
  const intruderFood = await findCategory(intruder.token, "Food");
  mine.category = intruderFood._id;
  mine.transaction = (await create(intruder.token, "/api/transactions", { categoryId: intruderFood._id, amount: 1000 }))._id;
  mine.rule = (await create(intruder.token, "/api/recurring", {
    categoryId: intruderFood._id,
    amount: 1000,
    frequency: "weekly",
    startDate: "2099-01-01",
  }))._id;
  mine.goal = (await create(intruder.token, "/api/goals", { name: "Bike", targetAmount: 1000000, color: "#4A9FE3" }))._id;
  mine.template = (await create(intruder.token, "/api/templates", { name: "Tea", categoryId: intruderFood._id, amount: 20000 }))._id;
  mine.wallet = (await create(intruder.token, "/api/wallets", { name: "Card", type: "bank", color: "#7D8CE8" }))._id;
});

describe("ownership: user A gets 404 for everything of user B", () => {
  // [label, method, path, body] — built lazily, the ids exist only after beforeAll
  const attempts = () => [
    // Categories
    ["read B's category", "get", `/api/categories/${theirs.category}`],
    ["rename B's category", "patch", `/api/categories/${theirs.category}`, { name: "Mine now" }],
    ["delete B's category", "delete", `/api/categories/${theirs.category}`],
    // Transactions
    ["read B's transaction", "get", `/api/transactions/${theirs.transaction}`],
    ["edit B's transaction", "patch", `/api/transactions/${theirs.transaction}`, { amount: 1 }],
    ["delete B's transaction", "delete", `/api/transactions/${theirs.transaction}`],
    ["create a transaction in B's category", "post", "/api/transactions", { categoryId: theirs.category, amount: 1000 }],
    ["create a transaction in B's wallet", "post", "/api/transactions", { categoryId: mine.category, amount: 1000, walletId: theirs.wallet }],
    ["move my transaction to B's category", "patch", `/api/transactions/${mine.transaction}`, { categoryId: theirs.category }],
    ["move my transaction to B's wallet", "patch", `/api/transactions/${mine.transaction}`, { walletId: theirs.wallet }],
    ["filter my list by B's category", "get", `/api/transactions?categoryId=${theirs.category}`],
    ["filter my list by B's wallet", "get", `/api/transactions?walletId=${theirs.wallet}`],
    ["export with B's category", "get", `/api/transactions/export?categoryId=${theirs.category}`],
    ["export with B's wallet", "get", `/api/transactions/export?walletId=${theirs.wallet}`],
    ["bulk-delete B's transaction", "post", "/api/transactions/bulk-delete", { ids: [theirs.transaction] }],
    ["bulk-delete mine and B's together", "post", "/api/transactions/bulk-delete", { ids: [mine.transaction, theirs.transaction] }],
    ["bulk-move B's transaction to my category", "patch", "/api/transactions/bulk-category", { ids: [theirs.transaction], categoryId: mine.category }],
    ["bulk-move mine to B's category", "patch", "/api/transactions/bulk-category", { ids: [mine.transaction], categoryId: theirs.category }],
    // Budgets
    ["change B's budget", "patch", `/api/budgets/${theirs.budget}`, { amount: 1 }],
    ["delete B's budget", "delete", `/api/budgets/${theirs.budget}`],
    ["create a budget for B's category", "post", "/api/budgets", { categoryId: theirs.category, month: MONTH, amount: 1000 }],
    // Recurring rules
    ["replace B's rule", "put", `/api/recurring/${theirs.rule}`, { categoryId: mine.category, amount: 1, frequency: "weekly", startDate: "2099-01-01" }],
    ["toggle B's rule", "patch", `/api/recurring/${theirs.rule}/toggle`],
    ["delete B's rule", "delete", `/api/recurring/${theirs.rule}`],
    ["create a rule in B's category", "post", "/api/recurring", { categoryId: theirs.category, amount: 1, frequency: "weekly", startDate: "2099-01-01" }],
    ["point my rule at B's category", "put", `/api/recurring/${mine.rule}`, { categoryId: theirs.category, amount: 1, frequency: "weekly", startDate: "2099-01-01" }],
    // Goals and contributions
    ["read B's goal", "get", `/api/goals/${theirs.goal}`],
    ["replace B's goal", "put", `/api/goals/${theirs.goal}`, { name: "Mine", targetAmount: 1, color: "#000000" }],
    ["delete B's goal", "delete", `/api/goals/${theirs.goal}`],
    ["deposit into B's goal", "post", `/api/goals/${theirs.goal}/contributions`, { amount: 1000 }],
    ["withdraw from B's goal", "post", `/api/goals/${theirs.goal}/contributions`, { amount: -1000 }],
    ["delete B's contribution", "delete", `/api/goals/${theirs.goal}/contributions/${theirs.contribution}`],
    ["delete B's contribution through my goal", "delete", `/api/goals/${mine.goal}/contributions/${theirs.contribution}`],
    // Templates
    ["read B's template", "get", `/api/templates/${theirs.template}`],
    ["edit B's template", "patch", `/api/templates/${theirs.template}`, { amount: 1 }],
    ["delete B's template", "delete", `/api/templates/${theirs.template}`],
    ["create a template in B's category", "post", "/api/templates", { name: "X", categoryId: theirs.category, amount: 1 }],
    ["point my template at B's category", "patch", `/api/templates/${mine.template}`, { categoryId: theirs.category }],
    // Wallets and transfers
    ["read B's wallet", "get", `/api/wallets/${theirs.wallet}`],
    ["edit B's wallet", "patch", `/api/wallets/${theirs.wallet}`, { name: "Mine now" }],
    ["archive B's wallet", "patch", `/api/wallets/${theirs.wallet}`, { archived: true }],
    ["delete B's wallet", "delete", `/api/wallets/${theirs.wallet}`],
    ["transfer from B's wallet", "post", "/api/transfers", { fromWalletId: theirs.wallet, toWalletId: mine.wallet, amount: 1000 }],
    ["transfer into B's wallet", "post", "/api/transfers", { fromWalletId: mine.wallet, toWalletId: theirs.wallet, amount: 1000 }],
    ["list the transfers of B's wallet", "get", `/api/transfers?walletId=${theirs.wallet}`],
    ["delete B's transfer", "delete", `/api/transfers/${theirs.transfer}`],
    // Notifications
    ["mark B's notification as read", "patch", `/api/notifications/${theirs.notification}/read`],
    ["delete B's notification", "delete", `/api/notifications/${theirs.notification}`],
  ];

  it("every attempt is a 404 in the usual error format, and B's data stays as it was", async () => {
    const before = await snapshotOf(owner);
    const results = [];
    for (const [label, method, path, body] of attempts()) {
      const res = await send(intruder.token, method, path, body);
      results.push({ label, status: res.status, success: res.body.success, code: res.body.code });
    }

    // One assertion for the whole table, so a failure lists every route that let A through
    expect(results.filter((r) => r.status !== 404 || r.success !== false || !/NOT_FOUND$/.test(r.code ?? ""))).toEqual([]);
    expect(await snapshotOf(owner)).toEqual(before);
  });

  it("A's own transaction is not changed by a bulk request that also names B's", async () => {
    const res = await send(intruder.token, "get", `/api/transactions/${mine.transaction}`);
    expect(res.status).toBe(200);
    expect(res.body.data.category._id).toBe(mine.category);
  });
});

describe("ownership: lists, totals and files only hold the user's own data", () => {
  it("the tags, the stats, the reports and the data export of A hold nothing of B", async () => {
    const tags = (await send(intruder.token, "get", "/api/tags")).body.data;
    expect(tags.map((t) => t.tag)).not.toContain("owner-tag");

    const summary = (await send(intruder.token, "get", `/api/stats/summary?month=${MONTH}`)).body.data;
    expect(summary.totalExpense).toBe(1000);

    const report = (await send(intruder.token, "get", `/api/reports/monthly?month=${MONTH}`)).body.data;
    expect(report.totals.expense).toBe(1000);

    const exported = (await send(intruder.token, "get", "/api/users/me/export")).body.data;
    const text = JSON.stringify(exported);
    for (const id of Object.values(theirs)) expect(text).not.toContain(String(id));
    expect(text).not.toContain("passwordHash");
  });

  it("a CSV row with a category name that only B has is refused, never saved in B's category", async () => {
    const res = await send(intruder.token, "post", "/api/transactions/import", {
      rows: [{ type: "expense", category: "Pets", amount: 1000 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ imported: 0, failed: 1 });
    expect(res.body.data.errors[0].code).toBe("IMPORT_CATEGORY_NOT_FOUND");
  });

  it("copying budgets only copies A's own budgets", async () => {
    const res = await send(intruder.token, "post", "/api/budgets/copy", { fromMonth: MONTH, toMonth: "2099-12" });
    expect(res.status).toBe(200);
    expect(res.body.data.copied).toBe(0);
  });
});
