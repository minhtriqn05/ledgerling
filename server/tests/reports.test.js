import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, findCategory, registerUser } from "./helpers.js";
import { changePercent } from "../src/services/reportService.js";
import { daysInMonth, monthDays, monthProgress, yearRange } from "../src/utils/month.js";

// A small, known set of transactions; every expected number below is worked out by hand.
// All data is in 2025, so it is always a finished month whatever day the tests run on.
//
// September 2025 (VND): income  Salary 18,000,000                                      = 18,000,000
//                       expense Food 200,000 + Bills 800,000 + Shopping 100,000        =  1,100,000
//                       balance 18,000,000 - 1,100,000                                 = 16,900,000
//
// October 2025 (VND):   income  Salary 20,000,000 + Other Income 1,500,000             = 21,500,000
//                       expense Food 120,000 (tags coffee, work) + Food 80,000 (tag work)
//                               + Bills 1,000,000 (10 Oct) + Transport 50,000 (23:30 on 31 Oct)
//                                                                                      =  1,250,000
//                       balance 21,500,000 - 1,250,000                                 = 20,250,000
//   changes from September: income  (21.5M - 18M) / 18M       = +19.4%
//                           expense (1.25M - 1.1M) / 1.1M     = +13.6%
//                           balance (20.25M - 16.9M) / 16.9M  = +19.8%
//   categories: Bills 1,000,000 = 80% (September 800,000: +25%)
//               Food    200,000 = 16% (September 200,000: 0%)
//               Transport 50,000 = 4% (September 0: null)
//   days with an expense: 3, 10, 20 and 31 Oct -> 27 days without one
//   average per day: 1,250,000 / 31 = 40,322.58 -> 40,323
//   tags: work = 120,000 + 80,000 = 200,000 (2 transactions), coffee = 120,000 (1)
// Not counted in October: a USD expense, a November expense (00:30 on 1 Nov), another user's expense.
//
// December 2025: Food 10,000 at 23:30 on 31 Dec (still 2025). January 2026: Food 7,000 at 00:30 on 1 Jan.
// November 2025: Food 70,000 (00:30 on 1 Nov, see above).
// Year 2025: income 39,500,000, expense 1,100,000 + 1,250,000 + 70,000 + 10,000 = 2,430,000, balance 37,070,000.

let user;
let other;

beforeAll(async () => {
  user = await registerUser();
  other = await registerUser();
  const cat = {};
  for (const name of ["Food", "Bills", "Transport", "Shopping", "Salary", "Other Income"]) {
    cat[name] = (await findCategory(user.token, name))._id;
  }
  const otherFood = (await findCategory(other.token, "Food"))._id;

  const add = (token, categoryId, amount, date, extra = {}) =>
    api().post("/api/transactions").set(auth(token)).send({ categoryId, amount, date, ...extra });

  // September 2025
  await add(user.token, cat.Salary, 18000000, "2025-09-01T08:00:00+07:00");
  await add(user.token, cat.Food, 200000, "2025-09-10T12:00:00+07:00");
  await add(user.token, cat.Bills, 800000, "2025-09-05T09:00:00+07:00");
  await add(user.token, cat.Shopping, 100000, "2025-09-20T15:00:00+07:00");
  // October 2025
  await add(user.token, cat.Salary, 20000000, "2025-10-01T08:00:00+07:00");
  await add(user.token, cat["Other Income"], 1500000, "2025-10-15T10:00:00+07:00");
  await add(user.token, cat.Food, 120000, "2025-10-03T12:00:00+07:00", { tags: ["coffee", "work"] });
  await add(user.token, cat.Food, 80000, "2025-10-20T19:00:00+07:00", { tags: ["work"] });
  await add(user.token, cat.Bills, 1000000, "2025-10-10T09:00:00+07:00", { note: "Electricity" });
  await add(user.token, cat.Transport, 50000, "2025-10-31T23:30:00+07:00");
  // Left out of October
  await add(user.token, cat.Food, 999, "2025-10-12T12:00:00+07:00", { currency: "USD" });
  await add(user.token, cat.Food, 70000, "2025-11-01T00:30:00+07:00");
  await add(other.token, otherFood, 5000000, "2025-10-05T12:00:00+07:00");
  // Year edges
  await add(user.token, cat.Food, 10000, "2025-12-31T23:30:00+07:00");
  await add(user.token, cat.Food, 7000, "2026-01-01T00:30:00+07:00");
});

const getMonthly = (query, token = user.token) => api().get(`/api/reports/monthly${query}`).set(auth(token));
const getYearly = (query, token = user.token) => api().get(`/api/reports/yearly${query}`).set(auth(token));

describe("GET /api/reports/monthly", () => {
  it("needs a token (401)", async () => {
    expect((await api().get("/api/reports/monthly?month=2025-10")).status).toBe(401);
  });

  it("matches the totals worked out by hand, for this month and last month", async () => {
    const res = await getMonthly("?month=2025-10");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      month: "2025-10",
      currency: "VND",
      totals: { income: 21500000, expense: 1250000, balance: 20250000 },
      previousMonth: "2025-09",
      previousTotals: { income: 18000000, expense: 1100000, balance: 16900000 },
      changes: { income: 19.4, expense: 13.6, balance: 19.8 },
    });
  });

  it("counts the 23:30 expense on the last day of the month in that month and day", async () => {
    const res = await getMonthly("?month=2025-10");
    const lastDay = res.body.data.dailyExpense.at(-1);

    expect(lastDay).toEqual({ date: "2025-10-31", total: 50000 });
    // ...and not in November
    expect((await getMonthly("?month=2025-11")).body.data.totals.expense).toBe(70000);
  });

  it("lists the top categories with share and change from last month", async () => {
    const res = await getMonthly("?month=2025-10");
    const rows = res.body.data.topCategories.map(
      ({ name, total, percent, previousTotal, changePercent: change }) => ({ name, total, percent, previousTotal, change })
    );

    expect(rows).toEqual([
      { name: "Bills", total: 1000000, percent: 80, previousTotal: 800000, change: 25 },
      { name: "Food", total: 200000, percent: 16, previousTotal: 200000, change: 0 },
      // Not spent on in September: nothing to compare with
      { name: "Transport", total: 50000, percent: 4, previousTotal: 0, change: null },
    ]);
    const first = res.body.data.topCategories[0];
    expect(first.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(first.icon).toBe("receipt"); // the default Bills category has an icon since categories got icons
    expect(first.categoryId).toBeTruthy();
  });

  it("returns every day of the month, 0 for days without expenses", async () => {
    const res = await getMonthly("?month=2025-10");
    const days = res.body.data.dailyExpense;

    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({ date: "2025-10-01", total: 0 });
    const spent = days.filter((d) => d.total > 0);
    expect(spent).toEqual([
      { date: "2025-10-03", total: 120000 },
      { date: "2025-10-10", total: 1000000 },
      { date: "2025-10-20", total: 80000 },
      { date: "2025-10-31", total: 50000 },
    ]);
    // The daily numbers add up to the month's expense
    expect(days.reduce((sum, d) => sum + d.total, 0)).toBe(res.body.data.totals.expense);
  });

  it("works out the average per day, the days without spending and the largest expense", async () => {
    const { data } = (await getMonthly("?month=2025-10")).body;

    expect(data.averagePerDay).toBe(40323);
    expect(data.noSpendDays).toBe(27);
    expect(data.largestExpense).toMatchObject({
      amount: 1000000,
      note: "Electricity",
      category: { name: "Bills", icon: "receipt" },
    });
    expect(data.largestExpense.date).toBe("2025-10-10T02:00:00.000Z");
  });

  it("lists the tags with the most expense", async () => {
    const { data } = (await getMonthly("?month=2025-10")).body;

    expect(data.topTags).toEqual([
      { tag: "work", total: 200000, count: 2 },
      { tag: "coffee", total: 120000, count: 1 },
    ]);
  });

  it("gives null changes when last month is 0", async () => {
    // August 2025 has nothing, so September cannot be compared with it
    const { data } = (await getMonthly("?month=2025-09")).body;

    expect(data.totals).toEqual({ income: 18000000, expense: 1100000, balance: 16900000 });
    expect(data.previousTotals).toEqual({ income: 0, expense: 0, balance: 0 });
    expect(data.changes).toEqual({ income: null, expense: null, balance: null });
    expect(data.topCategories.every((c) => c.changePercent === null)).toBe(true);
  });

  it("returns zeros for a month without transactions", async () => {
    const res = await getMonthly("?month=2025-02");

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totals: { income: 0, expense: 0, balance: 0 },
      changes: { income: null, expense: null, balance: null },
      topCategories: [],
      averagePerDay: 0,
      noSpendDays: 28,
      largestExpense: null,
      topTags: [],
    });
    expect(res.body.data.dailyExpense).toHaveLength(28);
    expect(res.body.data.dailyExpense.every((d) => d.total === 0)).toBe(true);
  });

  it("has 29 days in February of a leap year", async () => {
    expect((await getMonthly("?month=2024-02")).body.data.dailyExpense).toHaveLength(29);
  });

  it("only sums the chosen currency", async () => {
    const { data } = (await getMonthly("?month=2025-10&currency=USD")).body;

    expect(data.totals).toEqual({ income: 0, expense: 999, balance: -999 });
    expect(data.topCategories).toHaveLength(1);
  });

  it("only uses my own transactions", async () => {
    // The other user has one 5,000,000 expense in October 2025 and nothing else
    const { data } = (await getMonthly("?month=2025-10", other.token)).body;

    expect(data.totals).toEqual({ income: 0, expense: 5000000, balance: -5000000 });
    expect(data.topCategories).toHaveLength(1);
    expect(data.topTags).toEqual([]);
  });

  it("defaults to the current month", async () => {
    const res = await getMonthly("");
    expect(res.status).toBe(200);
    expect(res.body.data.month).toMatch(/^\d{4}-\d{2}$/);
  });

  it("refuses a bad month or currency (400)", async () => {
    for (const query of ["?month=2025-13", "?month=october", "?month=2025-1", "?currency=usd", "?currency=VNDD"]) {
      const res = await getMonthly(query);
      expect(res.status, query).toBe(400);
      expect(res.body.success).toBe(false);
    }
    expect((await getMonthly("?month=2025-13")).body.message).toBe("Month must be in YYYY-MM format");
  });

  it("includes the recurring transactions that are due", async () => {
    const recurringUser = await registerUser();
    const bills = await findCategory(recurringUser.token, "Bills");
    // A monthly rule that started in October 2025: its October transaction is created by this request
    const rule = await api()
      .post("/api/recurring")
      .set(auth(recurringUser.token))
      .send({ categoryId: bills._id, amount: 500000, note: "Rent", frequency: "monthly", startDate: "2025-10-05" });
    expect(rule.status).toBe(201);

    const { data } = (await getMonthly("?month=2025-10", recurringUser.token)).body;
    expect(data.totals.expense).toBe(500000);
    expect(data.dailyExpense.find((d) => d.date === "2025-10-05").total).toBe(500000);
  });
});

describe("GET /api/reports/yearly", () => {
  it("needs a token (401)", async () => {
    expect((await api().get("/api/reports/yearly?year=2025")).status).toBe(401);
  });

  it("matches the 12 months and the totals worked out by hand", async () => {
    const res = await getYearly("?year=2025");

    expect(res.status).toBe(200);
    expect(res.body.data.year).toBe(2025);
    expect(res.body.data.months).toHaveLength(12);
    expect(res.body.data.months.map((m) => m.month)).toEqual(
      Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, "0")}`)
    );
    expect(res.body.data.months[8]).toEqual({ month: "2025-09", income: 18000000, expense: 1100000, balance: 16900000 });
    expect(res.body.data.months[9]).toEqual({ month: "2025-10", income: 21500000, expense: 1250000, balance: 20250000 });
    // 31 Dec 23:30 stays in December; 1 Jan 00:30 is in 2026
    expect(res.body.data.months[11]).toEqual({ month: "2025-12", income: 0, expense: 10000, balance: -10000 });
    expect(res.body.data.months[0]).toEqual({ month: "2025-01", income: 0, expense: 0, balance: 0 });
    expect(res.body.data.totals).toEqual({ income: 39500000, expense: 2430000, balance: 37070000 });
    expect(res.body.data.topExpenseMonth).toEqual({ month: "2025-10", expense: 1250000 });
  });

  it("puts 00:30 on 1 January in the new year", async () => {
    const { data } = (await getYearly("?year=2026")).body;

    expect(data.months[0]).toEqual({ month: "2026-01", income: 0, expense: 7000, balance: -7000 });
    expect(data.topExpenseMonth).toEqual({ month: "2026-01", expense: 7000 });
  });

  it("returns zeros and no top month for a year without transactions", async () => {
    const res = await getYearly("?year=2020");

    expect(res.status).toBe(200);
    expect(res.body.data.months).toHaveLength(12);
    expect(res.body.data.months.every((m) => m.income === 0 && m.expense === 0 && m.balance === 0)).toBe(true);
    expect(res.body.data.totals).toEqual({ income: 0, expense: 0, balance: 0 });
    expect(res.body.data.topExpenseMonth).toBeNull();
  });

  it("only uses my own transactions", async () => {
    const { data } = (await getYearly("?year=2025", other.token)).body;

    expect(data.totals).toEqual({ income: 0, expense: 5000000, balance: -5000000 });
    expect(data.topExpenseMonth).toEqual({ month: "2025-10", expense: 5000000 });
  });

  it("defaults to the current year", async () => {
    const res = await getYearly("");
    expect(res.status).toBe(200);
    expect(res.body.data.months).toHaveLength(12);
  });

  it("refuses a bad year or currency (400)", async () => {
    for (const query of ["?year=25", "?year=abcd", "?year=1800", "?year=2101", "?year=2025-10", "?currency=usd"]) {
      const res = await getYearly(query);
      expect(res.status, query).toBe(400);
      expect(res.body.success).toBe(false);
    }
  });
});

describe("month helpers", () => {
  it("knows how many days a month has", () => {
    expect(daysInMonth("2025-02")).toBe(28);
    expect(daysInMonth("2024-02")).toBe(29);
    expect(daysInMonth("2025-10")).toBe(31);
    expect(daysInMonth("2025-11")).toBe(30);
    expect(monthDays("2025-02")).toHaveLength(28);
    expect(monthDays("2025-02")[27]).toBe("2025-02-28");
  });

  it("covers the whole year in Vietnam time", () => {
    const { from, to } = yearRange("2025");
    expect(from.toISOString()).toBe("2024-12-31T17:00:00.000Z");
    expect(to.toISOString()).toBe("2025-12-31T17:00:00.000Z");
  });

  it("counts the days that have passed", () => {
    expect(monthProgress("2025-10", "2025-10-10")).toEqual({ daysInMonth: 31, elapsedDays: 10, completedDays: 9 });
    expect(monthProgress("2025-09", "2025-10-10")).toEqual({ daysInMonth: 30, elapsedDays: 30, completedDays: 30 });
    expect(monthProgress("2025-11", "2025-10-10")).toEqual({ daysInMonth: 30, elapsedDays: 0, completedDays: 0 });
  });

  it("calculates the change in percent", () => {
    expect(changePercent(150, 100)).toBe(50);
    expect(changePercent(50, 100)).toBe(-50);
    expect(changePercent(0, 100)).toBe(-100);
    expect(changePercent(100, 0)).toBeNull();
    expect(changePercent(0, 0)).toBeNull();
    expect(changePercent(1, 3)).toBe(-66.7);
    // A balance that goes from -100 to -50 got better
    expect(changePercent(-50, -100)).toBe(50);
  });
});
