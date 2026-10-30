import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, findCategory, registerUser } from "./helpers.js";

// A small, known set of transactions; every expected number below is worked out by hand.
//
// October 2026 (VND):  income  Salary 20,000,000 + Other Income 1,500,000           = 21,500,000
//                      expense Food 120,000 + 80,000 = 200,000, Bills 1,000,000,
//                              Transport 50,000 (23:30 on 31 Oct)                    =  1,250,000
//                      balance 21,500,000 - 1,250,000                               = 20,250,000
// Not counted in October: a USD expense, a November expense (00:30 on 1 Nov), another user's expense.
// August 2026: one Food expense of 300,000 (for the 6-month chart).

let user;

beforeAll(async () => {
  user = await registerUser();
  const other = await registerUser();
  const cat = {};
  for (const name of ["Food", "Bills", "Transport", "Salary", "Other Income"]) {
    cat[name] = (await findCategory(user.token, name))._id;
  }
  const otherFood = (await findCategory(other.token, "Food"))._id;

  const add = (token, categoryId, amount, date, extra = {}) =>
    api().post("/api/transactions").set(auth(token)).send({ categoryId, amount, date, ...extra });

  await add(user.token, cat.Salary, 20000000, "2026-10-01T08:00:00+07:00");
  await add(user.token, cat["Other Income"], 1500000, "2026-10-15T10:00:00+07:00");
  await add(user.token, cat.Food, 120000, "2026-10-03T12:00:00+07:00");
  await add(user.token, cat.Food, 80000, "2026-10-20T19:00:00+07:00");
  await add(user.token, cat.Bills, 1000000, "2026-10-10T09:00:00+07:00");
  await add(user.token, cat.Transport, 50000, "2026-10-31T23:30:00+07:00");
  await add(user.token, cat.Food, 999, "2026-10-12T12:00:00+07:00", { currency: "USD" });
  await add(user.token, cat.Food, 70000, "2026-11-01T00:30:00+07:00");
  await add(user.token, cat.Food, 300000, "2026-08-08T12:00:00+07:00");
  await add(other.token, otherFood, 5000000, "2026-10-05T12:00:00+07:00");
});

describe("GET /api/stats/summary", () => {
  it("needs a token (401)", async () => {
    expect((await api().get("/api/stats/summary?month=2026-10")).status).toBe(401);
  });

  it("matches the totals worked out by hand", async () => {
    const res = await api().get("/api/stats/summary?month=2026-10").set(auth(user.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      month: "2026-10",
      currency: "VND",
      totalIncome: 21500000,
      totalExpense: 1250000,
      balance: 20250000,
    });
  });

  it("splits the expense by category, biggest first", async () => {
    const res = await api().get("/api/stats/summary?month=2026-10").set(auth(user.token));
    const rows = res.body.data.expenseByCategory.map(({ name, total }) => ({ name, total }));

    expect(rows).toEqual([
      { name: "Bills", total: 1000000 },
      { name: "Food", total: 200000 },
      { name: "Transport", total: 50000 },
    ]);
    expect(res.body.data.expenseByCategory[0].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("returns 6 months for the chart, oldest first, with 0 for empty months", async () => {
    const res = await api().get("/api/stats/summary?month=2026-10").set(auth(user.token));

    expect(res.body.data.byMonth).toEqual([
      { month: "2026-05", income: 0, expense: 0 },
      { month: "2026-06", income: 0, expense: 0 },
      { month: "2026-07", income: 0, expense: 0 },
      { month: "2026-08", income: 0, expense: 300000 },
      { month: "2026-09", income: 0, expense: 0 },
      { month: "2026-10", income: 21500000, expense: 1250000 },
    ]);
  });

  it("counts only the chosen currency", async () => {
    const res = await api().get("/api/stats/summary?month=2026-10&currency=USD").set(auth(user.token));
    expect(res.body.data).toMatchObject({ totalIncome: 0, totalExpense: 999, balance: -999 });
  });

  it("counts 00:30 on 1 Nov (Vietnam time) in November", async () => {
    const res = await api().get("/api/stats/summary?month=2026-11").set(auth(user.token));
    expect(res.body.data).toMatchObject({ totalIncome: 0, totalExpense: 70000, balance: -70000 });
  });

  it.each([
    ["month=2026-1", "Month must be in YYYY-MM format"],
    ["currency=usd", "Currency must be a 3-letter ISO code"],
  ])("refuses an invalid query %s (400)", async (query, message) => {
    const res = await api().get(`/api/stats/summary?${query}`).set(auth(user.token));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
  });
});
