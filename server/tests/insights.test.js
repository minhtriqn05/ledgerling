import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, findCategory, registerUser } from "./helpers.js";
import { buildInsights } from "../src/services/insightService.js";
import { currentMonth } from "../src/utils/month.js";

// ---------- The rules, tested one by one with made-up numbers ----------

// A finished month (all of it has passed), so no budget forecast and every day counts
const PAST = { month: "2025-10", today: "2026-03-15" };

// A monthly report with only the numbers the rules read
function makeReport({ income = 0, expense = 0, noSpendDays = 0, largestExpense = null } = {}) {
  return { totals: { income, expense, balance: income - expense }, noSpendDays, largestExpense };
}

function makeCategory(name, total, previousTotal) {
  const changePercent = previousTotal ? Math.round(((total - previousTotal) / previousTotal) * 1000) / 10 : null;
  return { categoryId: `id-${name}`, name, color: "#4A9FE3", icon: null, total, previousTotal, changePercent };
}

// The default report has some income and expense: an empty month has no insights at all
function run({ month = PAST.month, today = PAST.today, report = makeReport({ income: 100, expense: 100 }), categories = [], budgets = [] }) {
  return buildInsights({ month, today, report, categories, budgets });
}

const typesOf = (insights) => insights.map((i) => i.type);
const find = (insights, type) => insights.filter((i) => i.type === type);

describe("insight rule: category up / down", () => {
  it("fires at +20% and above, not below", () => {
    expect(typesOf(run({ categories: [makeCategory("Food", 119, 100)] }))).not.toContain("category-up");
    const insights = run({ categories: [makeCategory("Food", 120000, 100000)] });
    const [up] = find(insights, "category-up");

    expect(up).toMatchObject({ type: "category-up", severity: "warning" });
    expect(up.message).toBe("You spent 20.000 ₫ (20%) more on Food than last month.");
    expect(up.link).toBe("/transactions?month=2025-10&category=id-Food");
  });

  it("fires at -20% and below, not above", () => {
    expect(typesOf(run({ categories: [makeCategory("Food", 81, 100)] }))).not.toContain("category-down");
    const insights = run({ categories: [makeCategory("Food", 80000, 100000)] });
    const [down] = find(insights, "category-down");

    expect(down).toMatchObject({ type: "category-down", severity: "success" });
    expect(down.message).toBe("Nice! You spent 20.000 ₫ (20%) less on Food than last month.");
  });

  it("ignores a category that was 0 last month (the change is null)", () => {
    const types = typesOf(run({ categories: [makeCategory("Food", 500000, 0)] }));
    expect(types).not.toContain("category-up");
    expect(types).not.toContain("category-down");
  });

  it("mentions a category that dropped to 0", () => {
    const [down] = find(run({ categories: [makeCategory("Shopping", 0, 100000)] }), "category-down");
    expect(down.message).toBe("Nice! You spent 100.000 ₫ (100%) less on Shopping than last month.");
  });

  it("picks the biggest change in money, one up and one down", () => {
    const categories = [
      makeCategory("Small jump", 5000, 1000), // +400% but only 4.000 ₫
      makeCategory("Big jump", 1500000, 1000000), // +50%, 500.000 ₫
      makeCategory("Small drop", 400, 1000),
      makeCategory("Big drop", 100000, 600000),
    ];
    const insights = run({ categories });

    expect(find(insights, "category-up")).toHaveLength(1);
    expect(find(insights, "category-up")[0].message).toContain("Big jump");
    expect(find(insights, "category-down")).toHaveLength(1);
    expect(find(insights, "category-down")[0].message).toContain("Big drop");
  });
});

describe("insight rule: budget forecast", () => {
  const month = "2026-10";
  // Day 10 of 31: a budget of 1.000.000 ₫ is passed when more than 322.580 ₫ is spent by now (1.000.000 / 31 * 10)
  const budget = (spent, amount = 1000000, name = "Food") => ({ amount, spent, category: { name } });
  const forecast = (budgets, today = "2026-10-10") => find(run({ month, today, budgets }), "budget-forecast");

  it("fires when the pace passes the budget", () => {
    const [insight] = forecast([budget(400000)]);

    expect(insight).toMatchObject({ type: "budget-forecast", severity: "warning" });
    // 400.000 / 10 * 31 = 1.240.000
    expect(insight.message).toBe(
      "At this pace you will spend about 1.240.000 ₫ on Food by the end of the month, over your 1.000.000 ₫ budget."
    );
    expect(insight.link).toBe("/budgets?month=2026-10");
  });

  it("stays quiet when the pace stays within the budget", () => {
    // 300.000 / 10 * 31 = 930.000
    expect(forecast([budget(300000)])).toEqual([]);
    expect(forecast([budget(0)])).toEqual([]);
  });

  it("says so when the budget is already used up", () => {
    const [insight] = forecast([budget(1200000)]);
    expect(insight.message).toBe("You are already over your Food budget (1.200.000 ₫ of 1.000.000 ₫).");
  });

  it("only looks at the current month", () => {
    expect(forecast([budget(5000000)], "2026-11-10")).toEqual([]); // the month is over
    expect(forecast([budget(5000000)], "2026-09-30")).toEqual([]); // the month has not started
  });

  it("mentions at most 2 budgets, the biggest overshoot first", () => {
    const found = forecast([
      budget(400000, 1000000, "Food"),
      budget(900000, 1000000, "Bills"),
      budget(500000, 1000000, "Shopping"),
    ]);
    // Projected at day 10: Bills 2.790.000 (1.790.000 over), Shopping 1.550.000 (550.000 over), Food 1.240.000 (240.000 over)
    expect(found).toHaveLength(2);
    expect(found[0].message).toContain("Bills");
    expect(found[1].message).toContain("Shopping");
  });
});

describe("insight rule: days without spending", () => {
  const noSpend = (noSpendDays, today = PAST.today) =>
    find(run({ today, report: makeReport({ income: 1, expense: 1, noSpendDays }) }), "no-spend-days");

  it("celebrates 5 days or more (success)", () => {
    expect(noSpend(5)[0]).toMatchObject({ severity: "success", message: "You had 5 no-spend days in October 2025." });
  });

  it("is only information below 5 days", () => {
    expect(noSpend(4)[0].severity).toBe("info");
    expect(noSpend(1)[0].message).toBe("You had 1 no-spend day in October 2025.");
  });

  it("notes a month with an expense every day", () => {
    expect(noSpend(0)[0]).toMatchObject({ severity: "info" });
    expect(noSpend(0)[0].message).toContain("every day");
  });

  it("says nothing when no day has finished yet", () => {
    // 1 October, the day is still running
    expect(noSpend(0, "2025-10-01").length).toBe(0);
  });
});

describe("insight rule: savings rate", () => {
  const savings = (income, expense) => find(run({ report: makeReport({ income, expense }) }), "savings-rate");

  it("20% or more is good (success)", () => {
    expect(savings(1000, 800)[0]).toMatchObject({
      severity: "success",
      message: "Great! You saved 20% of your income in October 2025.",
    });
  });

  it("0-19% is only information", () => {
    expect(savings(1000, 810)[0]).toMatchObject({ severity: "info" });
    expect(savings(1000, 810)[0].message).toContain("You saved 19% of your income");
    expect(savings(1000, 1000)[0].severity).toBe("info");
  });

  it("spending more than the income is a warning", () => {
    expect(savings(1000000, 1250000)[0]).toMatchObject({
      severity: "warning",
      message: "You spent 250.000 ₫ more than you earned in October 2025 (savings rate -25%).",
    });
  });

  it("warns when there is spending but no income", () => {
    expect(savings(0, 50000)[0]).toMatchObject({
      severity: "warning",
      message: "You spent 50.000 ₫ but recorded no income in October 2025.",
    });
  });

  it("says nothing for an empty month", () => {
    expect(savings(0, 0)).toEqual([]);
  });
});

describe("insight rule: largest expense", () => {
  it("names the biggest expense and links to its day", () => {
    const largestExpense = {
      amount: 1000000,
      // 09:00 on 10 Oct in Vietnam
      date: new Date("2025-10-10T02:00:00.000Z"),
      category: { name: "Bills" },
    };
    const [insight] = find(run({ report: makeReport({ expense: 1000000, largestExpense }) }), "largest-expense");

    expect(insight).toMatchObject({ severity: "info", link: "/transactions?from=2025-10-10&to=2025-10-10" });
    expect(insight.message).toBe("Your largest expense was 1.000.000 ₫ on Bills (10 Oct).");
  });

  it("uses the Vietnam day, not the UTC day", () => {
    // 23:30 on 31 Oct in Vietnam is still 31 Oct 16:30 UTC; 00:30 on 1 Nov is 31 Oct 17:30 UTC
    const largestExpense = { amount: 5, date: new Date("2025-10-31T17:30:00.000Z"), category: { name: "Food" } };
    const [insight] = find(run({ report: makeReport({ expense: 5, largestExpense }) }), "largest-expense");
    expect(insight.link).toBe("/transactions?from=2025-11-01&to=2025-11-01");
  });

  it("says nothing without an expense", () => {
    expect(find(run({}), "largest-expense")).toEqual([]); // makeReport() has no largestExpense
  });
});

describe("insights as a list", () => {
  it("is empty for an empty month", () => {
    expect(run({ report: makeReport() })).toEqual([]);
    // ...even when a category dropped to 0, which says nothing about a month without data
    expect(run({ report: makeReport(), categories: [makeCategory("Shopping", 0, 100000)] })).toEqual([]);
  });

  it("has at most 6, warnings first, and drops the least important", () => {
    const insights = run({
      month: "2026-10",
      today: "2026-10-10",
      report: makeReport({
        income: 10000000,
        expense: 2000000,
        noSpendDays: 6,
        largestExpense: { amount: 900000, date: new Date("2026-10-04T05:00:00.000Z"), category: { name: "Bills" } },
      }),
      categories: [makeCategory("Food", 1500000, 1000000), makeCategory("Shopping", 100000, 600000)],
      budgets: [
        { amount: 1000000, spent: 400000, category: { name: "Food" } },
        { amount: 1000000, spent: 450000, category: { name: "Bills" } },
      ],
    });

    // 2 budget forecasts + category up + category down + savings rate + no-spend days + largest expense = 7
    expect(insights).toHaveLength(6);
    const order = { warning: 0, success: 1, info: 2 };
    const ranks = insights.map((i) => order[i.severity]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(typesOf(insights)).not.toContain("largest-expense");
    for (const insight of insights) {
      expect(Object.keys(insight).sort()).toEqual(["code", "link", "message", "params", "severity", "type"]);
      expect(["info", "warning", "success"]).toContain(insight.severity);
    }
  });
});

// ---------- The endpoint ----------

let user;
let other;

beforeAll(async () => {
  user = await registerUser();
  other = await registerUser();
  const cat = {};
  for (const name of ["Food", "Bills", "Transport", "Shopping", "Salary", "Other Income"]) {
    cat[name] = (await findCategory(user.token, name))._id;
  }
  const add = (categoryId, amount, date, extra = {}) =>
    api().post("/api/transactions").set(auth(user.token)).send({ categoryId, amount, date, ...extra });

  // The same numbers as reports.test.js: September and October 2025 (see the table there)
  await add(cat.Salary, 18000000, "2025-09-01T08:00:00+07:00");
  await add(cat.Food, 200000, "2025-09-10T12:00:00+07:00");
  await add(cat.Bills, 800000, "2025-09-05T09:00:00+07:00");
  await add(cat.Shopping, 100000, "2025-09-20T15:00:00+07:00");
  await add(cat.Salary, 20000000, "2025-10-01T08:00:00+07:00");
  await add(cat["Other Income"], 1500000, "2025-10-15T10:00:00+07:00");
  await add(cat.Food, 200000, "2025-10-03T12:00:00+07:00");
  await add(cat.Bills, 1000000, "2025-10-10T09:00:00+07:00");
  await add(cat.Transport, 50000, "2025-10-31T23:30:00+07:00");
});

const getInsights = (query, token = user.token) => api().get(`/api/insights${query}`).set(auth(token));

describe("GET /api/insights", () => {
  it("needs a token (401)", async () => {
    expect((await api().get("/api/insights?month=2025-10")).status).toBe(401);
  });

  it("returns the insights of the numbers worked out by hand", async () => {
    const res = await getInsights("?month=2025-10");

    expect(res.status).toBe(200);
    expect(res.body.data.month).toBe("2025-10");
    // Bills +25% (+200.000), Shopping -100% (-100.000), saved (21.5M - 1.25M) / 21.5M = 94%,
    // 28 days without an expense (3, 10 and 31 Oct have one), largest expense Bills 1.000.000 on 10 Oct
    expect(res.body.data.insights).toEqual([
      {
        type: "category-up",
        severity: "warning",
        message: "You spent 200.000 ₫ (25%) more on Bills than last month.",
        code: "CATEGORY_UP",
        params: { amount: 200000, percent: 25, category: "Bills" },
        link: expect.stringMatching(/^\/transactions\?month=2025-10&category=[0-9a-f]{24}$/),
      },
      {
        type: "category-down",
        severity: "success",
        message: "Nice! You spent 100.000 ₫ (100%) less on Shopping than last month.",
        code: "CATEGORY_DOWN",
        params: { amount: 100000, percent: 100, category: "Shopping" },
        link: expect.stringMatching(/^\/transactions\?month=2025-10&category=[0-9a-f]{24}$/),
      },
      {
        type: "savings-rate",
        severity: "success",
        message: "Great! You saved 94% of your income in October 2025.",
        code: "SAVINGS_GOOD",
        params: { rate: 94, month: "2025-10", target: 20 },
        link: "/reports?tab=monthly&month=2025-10",
      },
      {
        type: "no-spend-days",
        severity: "success",
        message: "You had 28 no-spend days in October 2025.",
        code: "NO_SPEND_DAYS",
        params: { count: 28, month: "2025-10" },
        link: "/reports?tab=calendar&month=2025-10",
      },
      {
        type: "largest-expense",
        severity: "info",
        message: "Your largest expense was 1.000.000 ₫ on Bills (10 Oct).",
        code: "LARGEST_EXPENSE",
        params: { amount: 1000000, category: "Bills", day: "2025-10-10" },
        link: "/transactions?from=2025-10-10&to=2025-10-10",
      },
    ]);
  });

  it("returns an empty list for a month without transactions", async () => {
    const res = await getInsights("?month=2025-02");

    expect(res.status).toBe(200);
    expect(res.body.data.insights).toEqual([]);
  });

  it("only uses my own transactions", async () => {
    const res = await getInsights("?month=2025-10", other.token);
    expect(res.body.data.insights).toEqual([]);
  });

  it("warns when a budget of this month will be passed at the current pace", async () => {
    const month = currentMonth();
    const food = await findCategory(user.token, "Food");
    // Spend today: whatever the day of the month is, spent / days passed * days in the month is above the budget
    // when everything is spent on day 1 up to today, so the budget below (10% of the spending) is always passed
    await api()
      .post("/api/transactions")
      .set(auth(user.token))
      .send({ categoryId: food._id, amount: 1000000, date: new Date().toISOString() });
    const budget = await api()
      .post("/api/budgets")
      .set(auth(user.token))
      .send({ categoryId: food._id, month, amount: 100000 });
    expect(budget.status).toBe(201);

    const res = await getInsights(`?month=${month}`);
    const forecast = res.body.data.insights.filter((i) => i.type === "budget-forecast");

    expect(forecast).toHaveLength(1);
    expect(forecast[0]).toMatchObject({ severity: "warning", link: `/budgets?month=${month}` });
    expect(forecast[0].message).toContain("Food");
    // Warnings come first
    expect(res.body.data.insights[0].severity).toBe("warning");
  });

  it("refuses a bad month or currency (400)", async () => {
    for (const query of ["?month=2025-13", "?month=abc", "?currency=usd"]) {
      const res = await getInsights(query);
      expect(res.status, query).toBe(400);
      expect(res.body.success).toBe(false);
    }
  });
});
