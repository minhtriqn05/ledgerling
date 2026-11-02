import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, findCategory, registerUser } from "./helpers.js";

// One month seen from every page must give the same numbers: the Dashboard (stats), the Reports (monthly, yearly,
// calendar), the Budgets and the CSV export. The data has the hard cases: the edges of the month in Vietnam time,
// a USD transaction (never added to VND), another user's data and amounts that must add up exactly.

const MONTH = "2026-10";
let user;

beforeAll(async () => {
  user = await registerUser();
  const other = await registerUser();
  const cat = {};
  for (const name of ["Food", "Transport", "Bills", "Salary", "Shopping"]) cat[name] = await findCategory(user.token, name);
  const add = (token, category, amount, date, extra = {}) =>
    api().post("/api/transactions").set(auth(token)).send({ categoryId: category._id, amount, date, ...extra });

  await add(user.token, cat.Salary, 15_000_001, "2026-10-01T00:00:00+07:00"); // the first second of October
  await add(user.token, cat.Food, 333_333, "2026-10-05T12:00:00+07:00");
  await add(user.token, cat.Food, 333_333, "2026-10-05T19:00:00+07:00");
  await add(user.token, cat.Food, 333_334, "2026-10-31T23:59:00+07:00"); // the last minute of October
  await add(user.token, cat.Transport, 45_000, "2026-10-12T08:00:00+07:00", { tags: ["work"] });
  await add(user.token, cat.Bills, 1_250_000, "2026-10-15T12:00:00+07:00");
  await add(user.token, cat.Shopping, 999_999_999_999, "2026-10-20T12:00:00+07:00"); // the biggest amount
  await add(user.token, cat.Food, 50, "2026-10-20T12:00:00+07:00", { currency: "USD" }); // not VND
  await add(user.token, cat.Food, 77_000, "2026-11-01T00:00:00+07:00"); // November
  await add(user.token, cat.Food, 1_000, "2026-09-30T23:59:00+07:00"); // September
  const otherFood = await findCategory(other.token, "Food");
  await add(other.token, otherFood, 123_456, "2026-10-10T12:00:00+07:00");

  for (const [category, amount] of [[cat.Food, 1_000_000], [cat.Bills, 1_000_000], [cat.Transport, 40_000]]) {
    await api().post("/api/budgets").set(auth(user.token)).send({ categoryId: category._id, month: MONTH, amount });
  }
});

const get = async (path) => {
  const res = await api().get(path).set(auth(user.token));
  expect(res.status, path).toBe(200);
  return res.body.data;
};

describe("one month, the same numbers everywhere", () => {
  it("Dashboard, Reports, Budgets, the calendar, the yearly view and the CSV export agree", async () => {
    const summary = await get(`/api/stats/summary?month=${MONTH}`);
    const report = await get(`/api/reports/monthly?month=${MONTH}`);
    const yearly = await get("/api/reports/yearly?year=2026");
    const budgets = await get(`/api/budgets?month=${MONTH}`);
    const csv = await api().get(`/api/transactions/export?month=${MONTH}`).set(auth(user.token));

    const expense = 333_333 + 333_333 + 333_334 + 45_000 + 1_250_000 + 999_999_999_999;
    const income = 15_000_001;

    // Dashboard = Reports, to the last dong
    expect([summary.totalIncome, summary.totalExpense, summary.balance]).toEqual([income, expense, income - expense]);
    expect(report.totals).toEqual({ income, expense, balance: income - expense });
    expect(summary.byMonth.find((m) => m.month === MONTH)).toEqual({ month: MONTH, income, expense });

    // Yearly: the October column is the same month
    expect(yearly.months[9]).toEqual({ month: MONTH, income, expense, balance: income - expense });

    // Calendar: the days add up to the month
    expect(report.dailyExpense.reduce((sum, day) => sum + day.total, 0)).toBe(expense);
    expect(report.dailyExpense.find((day) => day.date === "2026-10-31").total).toBe(333_334);

    // Per category: Dashboard chart = Reports = Budgets
    const byCategory = new Map(summary.expenseByCategory.map((c) => [c.name, c.total]));
    expect(byCategory.get("Food")).toBe(1_000_000);
    for (const category of report.topCategories) expect(category.total).toBe(byCategory.get(category.name));
    for (const budget of budgets) expect(budget.spent).toBe(byCategory.get(budget.category.name));
    expect(budgets.map((b) => [b.category.name, b.status])).toEqual([
      ["Bills", "over"],
      ["Food", "over"],
      ["Transport", "over"],
    ]);

    // The export holds the same VND expenses (the USD row is in the file too, with its currency)
    const rows = csv.text.trim().split("\r\n").slice(1).map((line) => line.split(","));
    const exported = rows.filter((r) => r[1] === "expense" && r[4] === "VND").reduce((sum, r) => sum + Number(r[3]), 0);
    expect(exported).toBe(expense);
  });

  it("the wallets hold every VND transaction of the user, of any month", async () => {
    const wallets = await get("/api/wallets");
    const cash = wallets.find((w) => w.isDefault);
    expect(cash.income).toBe(15_000_001);
    expect(cash.expense).toBe(333_333 + 333_333 + 333_334 + 45_000 + 1_250_000 + 999_999_999_999 + 77_000 + 1_000);
    expect(cash.balance).toBe(cash.income - cash.expense);
  });
});
