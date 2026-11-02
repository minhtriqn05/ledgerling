import { beforeAll, describe, expect, it } from "vitest";
import User from "../src/models/User.js";
import { currentMonth } from "../src/utils/month.js";
import { api, auth, findCategory, registerUser } from "./helpers.js";

// Input that the database would accept but the app must not: money that is not whole VND, days that do not exist,
// years outside 1970-2100 and page numbers far past the end. Each one is a 400 in the usual format, never a 500.

const MONTH = currentMonth();
let user;
let food;
let transactionId;
let budgetId;
let templateId;
let walletId;
let cashId;

function send(method, path, body) {
  const req = api()[method](path).set(auth(user.token));
  return body === undefined ? req : req.send(body);
}

beforeAll(async () => {
  user = await registerUser();
  food = await findCategory(user.token, "Food");
  transactionId = (await send("post", "/api/transactions", { categoryId: food._id, amount: 1000 })).body.data._id;
  budgetId = (await send("post", "/api/budgets", { categoryId: food._id, month: MONTH, amount: 100000 })).body.data._id;
  templateId = (await send("post", "/api/templates", { name: "Tea", categoryId: food._id, amount: 20000 })).body.data._id;
  walletId = (await send("post", "/api/wallets", { name: "Bank", type: "bank", color: "#4A9FE3" })).body.data._id;
  cashId = (await send("get", "/api/wallets")).body.data.find((w) => w.isDefault)._id;
});

// Every route that takes money, with a function that builds its body around one amount
const moneyRoutes = () => [
  ["create a transaction", "post", "/api/transactions", (amount) => ({ categoryId: food._id, amount })],
  ["edit a transaction", "patch", `/api/transactions/${transactionId}`, (amount) => ({ amount })],
  ["create a budget", "post", "/api/budgets", (amount) => ({ categoryId: food._id, month: "2099-01", amount })],
  ["edit a budget", "patch", `/api/budgets/${budgetId}`, (amount) => ({ amount })],
  ["create a template", "post", "/api/templates", (amount) => ({ name: "X", categoryId: food._id, amount })],
  ["edit a template", "patch", `/api/templates/${templateId}`, (amount) => ({ amount })],
  ["create a rule", "post", "/api/recurring", (amount) => ({ categoryId: food._id, amount, frequency: "weekly", startDate: "2099-01-01" })],
  ["create a transfer", "post", "/api/transfers", (amount) => ({ fromWalletId: cashId, toWalletId: walletId, amount })],
];

describe("money is whole VND", () => {
  it.each([
    ["a decimal", 1000.5],
    ["a tiny decimal", 0.000001],
    ["more than 12 digits", 1_000_000_000_000],
    ["a number past the safe range", 1e300],
  ])("%s is refused on every route that takes an amount (400 AMOUNT_INVALID)", async (_label, amount) => {
    const results = [];
    for (const [label, method, path, body] of moneyRoutes()) {
      const res = await send(method, path, body(amount));
      results.push({ label, status: res.status, code: res.body.code });
    }
    expect(results.filter((r) => r.status !== 400 || r.code !== "AMOUNT_INVALID")).toEqual([]);
  });

  it("the biggest amount the app can type (999,999,999,999) is accepted", async () => {
    const res = await send("post", "/api/transactions", { categoryId: food._id, amount: 999_999_999_999 });
    expect(res.status).toBe(201);
    await send("delete", `/api/transactions/${res.body.data._id}`);
  });

  it("a wallet's starting balance is whole VND too (400 WALLET_BALANCE_INVALID)", async () => {
    for (const initialBalance of [10.5, 1e13]) {
      const created = await send("post", "/api/wallets", { name: `W${initialBalance}`, type: "cash", color: "#3DB383", initialBalance });
      const edited = await send("patch", `/api/wallets/${walletId}`, { initialBalance });
      expect([created.status, created.body.code]).toEqual([400, "WALLET_BALANCE_INVALID"]);
      expect([edited.status, edited.body.code]).toEqual([400, "WALLET_BALANCE_INVALID"]);
    }
  });

  it("a CSV row with a decimal amount is listed as a bad row, the others are saved", async () => {
    const res = await send("post", "/api/transactions/import", {
      rows: [
        { type: "expense", category: "Food", amount: 35000.5 },
        { type: "expense", category: "Food", amount: 35000 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ imported: 1, failed: 1 });
    expect(res.body.data.errors[0]).toMatchObject({ row: 1, code: "AMOUNT_INVALID" });
  });
});

describe("days that do not exist and years outside 1970-2100", () => {
  it.each([
    ["30 February", "2026-02-30T10:00:00+07:00"],
    ["31 April", "2026-04-31T10:00:00Z"],
    ["29 February of a year that is not a leap year", "2025-02-29T12:00:00+07:00"],
    ["a year before 1970", "1969-12-31T12:00:00+07:00"],
    ["a year after 2100", "2101-01-01T12:00:00+07:00"],
  ])("%s is refused as a transaction or transfer date (400 DATE_INVALID)", async (_label, date) => {
    const created = await send("post", "/api/transactions", { categoryId: food._id, amount: 1000, date });
    const edited = await send("patch", `/api/transactions/${transactionId}`, { date });
    const transfer = await send("post", "/api/transfers", { fromWalletId: cashId, toWalletId: walletId, amount: 1000, date });
    for (const res of [created, edited, transfer]) {
      expect([res.status, res.body.code]).toEqual([400, "DATE_INVALID"]);
    }
  });

  it("29 February of a leap year is a real day", async () => {
    const res = await send("post", "/api/transactions", { categoryId: food._id, amount: 1000, date: "2028-02-29T12:00:00+07:00" });
    expect(res.status).toBe(201);
    expect(res.body.data.date).toBe("2028-02-29T05:00:00.000Z");
    await send("delete", `/api/transactions/${res.body.data._id}`);
  });

  it("a CSV row with an ISO date on 30 February is a bad row", async () => {
    const res = await send("post", "/api/transactions/import", {
      rows: [{ type: "expense", category: "Food", amount: 1000, date: "2026-02-30T10:00:00Z" }],
    });
    expect(res.body.data).toMatchObject({ imported: 0, failed: 1 });
    expect(res.body.data.errors[0].code).toBe("DATE_INVALID");
  });

  it("days of rules, goals and filters outside 1970-2100 are refused (400 DATE_INVALID)", async () => {
    const results = await Promise.all([
      send("post", "/api/recurring", { categoryId: food._id, amount: 1000, frequency: "weekly", startDate: "1900-01-01" }),
      send("post", "/api/goals", { name: "Far", targetAmount: 1000, color: "#3DB383", deadline: "2200-01-01" }),
      send("get", "/api/transactions?from=1900-01-01"),
      send("get", "/api/transactions?to=2200-01-01"),
    ]);
    expect(results.map((res) => [res.status, res.body.code])).toEqual(Array(4).fill([400, "DATE_INVALID"]));
  });
});

describe("text lengths", () => {
  it("an email longer than 254 characters (the limit of an address) is refused at register and login", async () => {
    const email = `${"a".repeat(250)}@example.com`;
    const register = await api().post("/api/auth/register").send({ name: "Long", email, password: "secret123" });
    const login = await api().post("/api/auth/login").send({ email, password: "secret123" });
    for (const res of [register, login]) expect([res.status, res.body.code]).toEqual([400, "EMAIL_INVALID"]);
  });
});

describe("page numbers", () => {
  it("a page far past anything that exists is a 400 on every paginated list, never a 500", async () => {
    await User.updateOne({ _id: user.user._id }, { role: "admin" });
    const huge = "99999999999999999999";
    const paths = ["/api/transactions", "/api/transfers", "/api/notifications", "/api/admin/users"];
    const results = [];
    for (const path of paths) {
      const res = await send("get", `${path}?page=${huge}`);
      results.push({ path, status: res.status, success: res.body.success });
    }
    expect(results).toEqual(paths.map((path) => ({ path, status: 400, success: false })));
  });

  it("the last allowed page answers an empty list", async () => {
    const res = await send("get", "/api/transactions?page=100000");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
