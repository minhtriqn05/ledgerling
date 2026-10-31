import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import RecurringRule from "../src/models/RecurringRule.js";
import Transaction from "../src/models/Transaction.js";
import { processDueRules } from "../src/services/recurringService.js";
import { dayNoon, vietnamDay } from "../src/utils/month.js";
import { api, auth, findCategory, registerUser } from "./helpers.js";

// Only Date is faked: real timers keep running, so MongoDB and the HTTP requests work as usual.
// The clock must be set before registerUser, because the token lasts 1 hour from "now".
function setToday(day, time = "12:00:00") {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${day}T${time}+07:00`));
}

afterEach(() => {
  vi.useRealTimers();
});

// A new user with their Bills (expense) and Salary (income) categories
async function newUser() {
  const user = await registerUser();
  const bills = await findCategory(user.token, "Bills");
  const salary = await findCategory(user.token, "Salary");
  return { ...user, bills, salary };
}

function postRule(token, body) {
  return api().post("/api/recurring").set(auth(token)).send(body);
}

// Creates a rule (monthly, 100.000) and returns it. overrides change only what the test is about.
async function createRule(user, overrides = {}) {
  const res = await postRule(user.token, {
    categoryId: user.bills._id,
    amount: 100000,
    note: "Rent",
    frequency: "monthly",
    startDate: "2026-10-01",
    ...overrides,
  });
  expect(res.status).toBe(201);
  return res.body.data;
}

function listTransactions(user, query = "") {
  return api().get(`/api/transactions${query}`).set(auth(user.token));
}

// The days (Vietnam time) of the transactions a rule created, oldest first
async function runDays(ruleId) {
  const transactions = await Transaction.find({ recurringRuleId: ruleId }).sort({ date: 1 });
  return transactions.map((t) => vietnamDay(t.date));
}

async function nextRunOf(ruleId) {
  const rule = await RecurringRule.findById(ruleId);
  return vietnamDay(rule.nextRunDate);
}

describe("recurring rules: auth", () => {
  it("needs a token on every route (401)", async () => {
    const id = "6720e1b2c3d4e5f601234590";
    expect((await api().get("/api/recurring")).status).toBe(401);
    expect((await api().post("/api/recurring").send({})).status).toBe(401);
    expect((await api().put(`/api/recurring/${id}`).send({})).status).toBe(401);
    expect((await api().patch(`/api/recurring/${id}/toggle`)).status).toBe(401);
    expect((await api().delete(`/api/recurring/${id}`)).status).toBe(401);
  });
});

describe("recurring rules: create", () => {
  let user;
  beforeAll(async () => {
    user = await newUser();
  });

  it("creates a rule that first runs on its start date", async () => {
    const res = await postRule(user.token, {
      categoryId: user.bills._id,
      amount: 3500000,
      note: "  Rent  ",
      frequency: "monthly",
      startDate: "2030-01-31",
      endDate: "2030-12-31",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      amount: 3500000,
      note: "Rent",
      frequency: "monthly",
      active: true,
      ended: false,
      startDate: dayNoon("2030-01-31").toISOString(),
      nextRunDate: dayNoon("2030-01-31").toISOString(),
      endDate: dayNoon("2030-12-31").toISOString(),
    });
    expect(res.body.data.category).toMatchObject({ name: "Bills", color: user.bills.color });
    expect(res.body.data.userId).toBeUndefined();
  });

  it("has no end date by default, and ignores a userId in the body", async () => {
    const other = await newUser();
    const rule = await createRule(user, { userId: other.user._id, startDate: "2030-02-01" });

    expect(rule.endDate).toBeNull();
    const list = await api().get("/api/recurring").set(auth(other.token));
    expect(list.body.data).toEqual([]);
  });

  it.each([
    ["amount 0", { amount: 0 }, "Amount must be greater than 0"],
    ["negative amount", { amount: -5 }, "Amount must be greater than 0"],
    ["amount as a string", { amount: "5000" }, "Amount must be greater than 0"],
    ["unknown frequency", { frequency: "daily" }, "Frequency must be weekly or monthly"],
    ["no frequency", { frequency: undefined }, "Frequency must be weekly or monthly"],
    ["no start date", { startDate: undefined }, "Start date must be a date in YYYY-MM-DD format"],
    ["bad start date", { startDate: "01/10/2026" }, "Start date must be a date in YYYY-MM-DD format"],
    ["a day that does not exist", { startDate: "2026-02-30" }, "Start date must be a date in YYYY-MM-DD format"],
    ["bad end date", { endDate: "soon" }, "End date must be a date in YYYY-MM-DD format"],
    ["end date before the start", { endDate: "2026-09-30" }, "End date must be after the start date"],
    ["end date on the start", { endDate: "2026-10-01" }, "End date must be after the start date"],
    ["bad category id", { categoryId: "abc" }, "Category id is invalid"],
    ["note too long", { note: "x".repeat(201) }, "Note must be at most 200 characters"],
    ["note not a string", { note: 5 }, "Note must be a string"],
  ])("refuses %s (400)", async (_name, overrides, message) => {
    const res = await postRule(user.token, {
      categoryId: user.bills._id,
      amount: 1000,
      frequency: "monthly",
      startDate: "2026-10-01",
      ...overrides,
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message, code: expect.any(String) });
  });

  it("refuses another user's category (404)", async () => {
    const other = await newUser();
    const res = await postRule(user.token, {
      categoryId: other.bills._id,
      amount: 1000,
      frequency: "monthly",
      startDate: "2026-10-01",
    });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Category not found");
  });
});

describe("recurring rules: another user's rule", () => {
  it("looks like it does not exist (404), and stays unchanged", async () => {
    const owner = await newUser();
    const other = await newUser();
    const rule = await createRule(owner, { startDate: "2030-01-01" });
    const path = `/api/recurring/${rule._id}`;
    const body = { categoryId: other.bills._id, amount: 1, frequency: "weekly", startDate: "2030-01-01" };

    expect((await api().put(path).set(auth(other.token)).send(body)).status).toBe(404);
    expect((await api().patch(`${path}/toggle`).set(auth(other.token))).status).toBe(404);
    expect((await api().delete(path).set(auth(other.token))).status).toBe(404);
    expect((await api().get("/api/recurring").set(auth(other.token))).body.data).toEqual([]);

    const list = await api().get("/api/recurring").set(auth(owner.token));
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ amount: 100000, active: true, frequency: "monthly" });
  });

  it("answers 404 for a malformed id", async () => {
    const { token } = await newUser();
    expect((await api().delete("/api/recurring/abc").set(auth(token))).status).toBe(404);
    expect((await api().patch("/api/recurring/abc/toggle").set(auth(token))).status).toBe(404);
  });
});

describe("recurring rules: processDueRules", () => {
  it("runs a monthly rule on day 31: a shorter month uses its last day", async () => {
    setToday("2026-11-30");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-08-31" });

    await listTransactions(user);

    expect(await runDays(rule._id)).toEqual(["2026-08-31", "2026-09-30", "2026-10-31", "2026-11-30"]);
    expect(await nextRunOf(rule._id)).toBe("2026-12-31");
  });

  it("goes back to day 31 after February", async () => {
    setToday("2027-03-31");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-12-31" });

    await listTransactions(user);

    expect(await runDays(rule._id)).toEqual(["2026-12-31", "2027-01-31", "2027-02-28", "2027-03-31"]);
  });

  it("copies type from the category and note from the rule, and marks the transaction", async () => {
    setToday("2026-10-15");
    const user = await newUser();
    const rule = await createRule(user, {
      categoryId: user.salary._id,
      amount: 18500000,
      note: "Monthly salary",
      startDate: "2026-10-05",
    });

    const res = await listTransactions(user, "?month=2026-10");

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      type: "income",
      amount: 18500000,
      currency: "VND",
      note: "Monthly salary",
      recurringRuleId: rule._id,
      date: dayNoon("2026-10-05").toISOString(),
    });
    expect(res.body.data[0].category.name).toBe("Salary");
  });

  it("runs a weekly rule every 7 days", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    const rule = await createRule(user, { frequency: "weekly", startDate: "2026-10-02" });

    await listTransactions(user);

    expect(await runDays(rule._id)).toEqual(["2026-10-02", "2026-10-09", "2026-10-16", "2026-10-23", "2026-10-30"]);
    expect(await nextRunOf(rule._id)).toBe("2026-11-06");
  });

  it("stops after the end date, which is the last day that can run", async () => {
    setToday("2026-12-20");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-08-15", endDate: "2026-10-15" });

    await listTransactions(user);
    await listTransactions(user);

    expect(await runDays(rule._id)).toEqual(["2026-08-15", "2026-09-15", "2026-10-15"]);
    const list = await api().get("/api/recurring").set(auth(user.token));
    expect(list.body.data[0]).toMatchObject({ ended: true, active: true });
  });

  it("does not run past the end date when the end is between two runs", async () => {
    setToday("2026-12-20");
    const user = await newUser();
    const rule = await createRule(user, { frequency: "weekly", startDate: "2026-10-01", endDate: "2026-10-10" });

    await listTransactions(user);

    expect(await runDays(rule._id)).toEqual(["2026-10-01", "2026-10-08"]);
  });

  it("creates nothing for a rule that starts in the future", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-10-31" });

    await listTransactions(user);

    expect(await runDays(rule._id)).toEqual([]);
    expect(await nextRunOf(rule._id)).toBe("2026-10-31");
  });

  it("counts today in Vietnam time, not in UTC", async () => {
    // 16:59 UTC on the 14th is 23:59 on the 14th in Vietnam, so the rule of the 15th is not due yet
    setToday("2026-10-14", "23:59:00");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-10-15" });
    await listTransactions(user);
    expect(await runDays(rule._id)).toEqual([]);

    // One minute later it is the 15th in Vietnam, but still the 14th in UTC
    vi.setSystemTime(new Date("2026-10-15T00:00:00+07:00"));
    await listTransactions(user);
    expect(await runDays(rule._id)).toEqual(["2026-10-15"]);
  });

  it("creates at most 60 transactions per rule per request, and continues on the next one", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    // 70 weeks of runs up to today
    const rule = await createRule(user, { frequency: "weekly", startDate: "2025-06-27" });

    await listTransactions(user);
    expect(await runDays(rule._id)).toHaveLength(60);

    await listTransactions(user);
    const days = await runDays(rule._id);
    expect(days).toHaveLength(71);
    expect(days.at(-1)).toBe("2026-10-30");
  });

  it("runs on GET /transactions, GET /stats/summary, GET /budgets and GET /recurring", async () => {
    setToday("2026-10-30");
    const user = await newUser();

    for (const path of ["/api/transactions", "/api/stats/summary", "/api/budgets", "/api/recurring"]) {
      const rule = await createRule(user, { startDate: "2026-10-01" });
      const res = await api().get(path).set(auth(user.token));
      expect(res.status).toBe(200);
      expect(await runDays(rule._id)).toEqual(["2026-10-01"]);
    }
  });

  it("counts the created transactions in the same answer of the summary and the budgets", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    await api()
      .post("/api/budgets")
      .set(auth(user.token))
      .send({ categoryId: user.bills._id, month: "2026-10", amount: 1000000 });
    await createRule(user, { amount: 250000, startDate: "2026-10-01" });

    const summary = await api().get("/api/stats/summary?month=2026-10").set(auth(user.token));
    expect(summary.body.data.totalExpense).toBe(250000);

    const budgets = await api().get("/api/budgets?month=2026-10").set(auth(user.token));
    expect(budgets.body.data[0].spent).toBe(250000);
  });

  it("only touches the rules of the given user", async () => {
    setToday("2026-10-30");
    const owner = await newUser();
    const other = await newUser();
    const rule = await createRule(owner);

    await listTransactions(other);
    expect(await runDays(rule._id)).toEqual([]);
  });
});

describe("recurring rules: running at the same time", () => {
  it("5 parallel requests create every transaction exactly once", async () => {
    setToday("2026-11-30");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-08-31" });

    const answers = await Promise.all(Array.from({ length: 5 }, () => listTransactions(user)));

    expect(answers.map((res) => res.status)).toEqual([200, 200, 200, 200, 200]);
    expect(await runDays(rule._id)).toEqual(["2026-08-31", "2026-09-30", "2026-10-31", "2026-11-30"]);
    expect(await nextRunOf(rule._id)).toBe("2026-12-31");
  });

  it("parallel requests on different routes create no duplicate, with several rules", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    const weekly = await createRule(user, { frequency: "weekly", startDate: "2026-10-02" });
    const monthly = await createRule(user, { startDate: "2026-08-01" });

    await Promise.all(
      ["/api/transactions", "/api/stats/summary", "/api/budgets", "/api/recurring", "/api/transactions"].map((path) =>
        api().get(path).set(auth(user.token))
      )
    );

    expect(await runDays(weekly._id)).toEqual(["2026-10-02", "2026-10-09", "2026-10-16", "2026-10-23", "2026-10-30"]);
    expect(await runDays(monthly._id)).toEqual(["2026-08-01", "2026-09-01", "2026-10-01"]);
  });

  it("every parallel request answers only after everything due has been created", async () => {
    setToday("2026-11-30");
    const user = await newUser();
    await createRule(user, { amount: 100, startDate: "2026-08-31" });

    const answers = await Promise.all(
      Array.from({ length: 5 }, () => api().get("/api/stats/summary?month=2026-11").set(auth(user.token)))
    );

    expect(answers.map((res) => res.body.data.totalExpense)).toEqual([100, 100, 100, 100, 100]);
  });

  it("ignores the duplicate error when the transaction of the date already exists", async () => {
    setToday("2026-10-15");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-10-01" });
    // As if a request crashed after creating the transaction but before moving nextRunDate
    await Transaction.create({
      userId: user.user._id,
      categoryId: user.bills._id,
      type: "expense",
      amount: 100000,
      date: dayNoon("2026-10-01"),
      recurringRuleId: rule._id,
    });

    await processDueRules(user.user._id);

    expect(await runDays(rule._id)).toEqual(["2026-10-01"]);
    expect(await nextRunOf(rule._id)).toBe("2026-11-01");
  });

  it("the unique index only applies to transactions of a rule", async () => {
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2030-01-01" });
    const base = { userId: user.user._id, categoryId: user.bills._id, type: "expense", amount: 1, date: dayNoon("2026-05-05") };

    // Without a rule: the same date twice is fine
    await Transaction.create(base);
    await Transaction.create(base);

    await Transaction.create({ ...base, recurringRuleId: rule._id });
    await expect(Transaction.create({ ...base, recurringRuleId: rule._id })).rejects.toMatchObject({ code: 11000 });
  });
});

describe("recurring rules: toggle", () => {
  it("a rule that is off creates nothing", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-10-01" });

    const off = await api().patch(`/api/recurring/${rule._id}/toggle`).set(auth(user.token));
    expect(off.status).toBe(200);
    expect(off.body.data.active).toBe(false);
    expect(off.body.data.category.name).toBe("Bills");

    await listTransactions(user);
    expect(await runDays(rule._id)).toEqual([]);
  });

  it("stops creating more after it is turned off", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-10-01" });
    await listTransactions(user);
    expect(await runDays(rule._id)).toEqual(["2026-10-01"]);

    await api().patch(`/api/recurring/${rule._id}/toggle`).set(auth(user.token));
    vi.setSystemTime(new Date("2026-10-30T23:00:00+07:00"));
    await RecurringRule.updateOne({ _id: rule._id }, { nextRunDate: dayNoon("2026-10-30") });
    await listTransactions(user);

    expect(await runDays(rule._id)).toEqual(["2026-10-01"]);
  });

  it("turning it back on skips the dates that passed while it was off", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-08-31" });
    await api().patch(`/api/recurring/${rule._id}/toggle`).set(auth(user.token));

    const on = await api().patch(`/api/recurring/${rule._id}/toggle`).set(auth(user.token));

    expect(on.body.data.active).toBe(true);
    expect(vietnamDay(new Date(on.body.data.nextRunDate))).toBe("2026-10-31");
    await listTransactions(user);
    expect(await runDays(rule._id)).toEqual([]);
  });

  it("turning it back on keeps a next run that is still ahead", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-12-15" });

    await api().patch(`/api/recurring/${rule._id}/toggle`).set(auth(user.token));
    const on = await api().patch(`/api/recurring/${rule._id}/toggle`).set(auth(user.token));

    expect(vietnamDay(new Date(on.body.data.nextRunDate))).toBe("2026-12-15");
  });
});

describe("recurring rules: update", () => {
  function putRule(user, rule, overrides) {
    return api()
      .put(`/api/recurring/${rule._id}`)
      .set(auth(user.token))
      .send({
        categoryId: user.bills._id,
        amount: rule.amount,
        note: rule.note,
        frequency: rule.frequency,
        startDate: vietnamDay(new Date(rule.startDate)),
        ...overrides,
      });
  }

  it("keeps nextRunDate when the schedule stays the same, and never changes old transactions", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-09-10" });
    await listTransactions(user);

    const res = await putRule(user, rule, { amount: 999, note: "New note", categoryId: user.salary._id });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ amount: 999, note: "New note" });
    expect(res.body.data.category.name).toBe("Salary");
    expect(vietnamDay(new Date(res.body.data.nextRunDate))).toBe("2026-11-10");

    const old = await Transaction.find({ recurringRuleId: rule._id });
    expect(old).toHaveLength(2);
    expect(old.every((t) => t.amount === 100000 && t.note === "Rent" && t.type === "expense")).toBe(true);
  });

  it("the next transaction uses the new values", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-10-10" });
    await listTransactions(user);
    await putRule(user, rule, { amount: 999, note: "New note", categoryId: user.salary._id });

    vi.setSystemTime(new Date("2026-11-10T08:00:00+07:00"));
    // The first token expired after the clock moved
    const token = (await api().post("/api/auth/login").send({ email: user.email, password: user.password })).body.data.token;
    await api().get("/api/transactions").set(auth(token));

    const latest = await Transaction.findOne({ recurringRuleId: rule._id }).sort({ date: -1 });
    expect(latest).toMatchObject({ amount: 999, note: "New note", type: "income" });
    expect(vietnamDay(latest.date)).toBe("2026-11-10");
  });

  it("changing the frequency does not create the past again", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-09-02" });
    await listTransactions(user);
    expect(await runDays(rule._id)).toEqual(["2026-09-02", "2026-10-02"]);

    const res = await putRule(user, rule, { frequency: "weekly" });

    // 2 Sep + 5 weeks = 7 Oct is the first weekly date after the last transaction
    expect(vietnamDay(new Date(res.body.data.nextRunDate))).toBe("2026-10-07");
    await listTransactions(user);
    expect(await runDays(rule._id)).toEqual([
      "2026-09-02",
      "2026-10-02",
      "2026-10-07",
      "2026-10-14",
      "2026-10-21",
      "2026-10-28",
    ]);
  });

  it("moving the start date to the future moves the next run there, and keeps old transactions", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-10-01" });
    await listTransactions(user);

    const res = await putRule(user, rule, { startDate: "2026-12-20" });

    expect(vietnamDay(new Date(res.body.data.nextRunDate))).toBe("2026-12-20");
    await listTransactions(user);
    expect(await runDays(rule._id)).toEqual(["2026-10-01"]);
  });

  it("a rule that has not run yet restarts from the new start date", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-12-01" });

    const res = await putRule(user, rule, { startDate: "2026-10-05" });

    expect(vietnamDay(new Date(res.body.data.nextRunDate))).toBe("2026-10-05");
    await listTransactions(user);
    expect(await runDays(rule._id)).toEqual(["2026-10-05"]);
  });

  it("leaving out endDate removes it, and moving it later wakes up an ended rule", async () => {
    setToday("2026-12-20");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-10-15", endDate: "2026-10-20" });
    await listTransactions(user);
    expect(await runDays(rule._id)).toEqual(["2026-10-15"]);

    const res = await putRule(user, rule, {});
    expect(res.body.data).toMatchObject({ endDate: null, ended: false });

    await listTransactions(user);
    expect(await runDays(rule._id)).toEqual(["2026-10-15", "2026-11-15", "2026-12-15"]);
  });

  it("validates like create (400), and refuses another user's category (404)", async () => {
    const user = await newUser();
    const other = await newUser();
    const rule = await createRule(user, { startDate: "2030-01-01" });

    const bad = await putRule(user, rule, { endDate: "2029-01-01" });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe("End date must be after the start date");

    expect((await putRule(user, rule, { frequency: "yearly" })).status).toBe(400);
    expect((await putRule(user, rule, { categoryId: other.bills._id })).status).toBe(404);
  });
});

describe("recurring rules: delete", () => {
  it("keeps the created transactions, with their label, and creates no more", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2026-10-01" });
    await listTransactions(user);

    const res = await api().delete(`/api/recurring/${rule._id}`).set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(rule._id);
    expect((await api().get("/api/recurring").set(auth(user.token))).body.data).toEqual([]);

    const list = await listTransactions(user, "?month=2026-10");
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].recurringRuleId).toBe(rule._id);
  });
});

describe("deleting a category that still has a recurring rule", () => {
  it("is blocked with 409, and works once the rule is gone", async () => {
    const user = await newUser();
    const made = await api()
      .post("/api/categories")
      .set(auth(user.token))
      .send({ name: "Gym", type: "expense", color: "#445566" });
    const categoryId = made.body.data._id;
    const rule = await createRule(user, { categoryId, startDate: "2030-01-01" });

    const blocked = await api().delete(`/api/categories/${categoryId}`).set(auth(user.token));
    expect(blocked.status).toBe(409);
    expect(blocked.body).toEqual({ success: false, message: "Category still has recurring rules", code: expect.any(String) });

    // A rule that is off still uses the category
    await api().patch(`/api/recurring/${rule._id}/toggle`).set(auth(user.token));
    expect((await api().delete(`/api/categories/${categoryId}`).set(auth(user.token))).status).toBe(409);

    await api().delete(`/api/recurring/${rule._id}`).set(auth(user.token));
    expect((await api().delete(`/api/categories/${categoryId}`).set(auth(user.token))).status).toBe(200);
  });
});

describe("transactions and the recurringRuleId field", () => {
  it("a client cannot set it when creating, updating or importing", async () => {
    const user = await newUser();
    const rule = await createRule(user, { startDate: "2030-01-01" });

    const created = await api()
      .post("/api/transactions")
      .set(auth(user.token))
      .send({ categoryId: user.bills._id, amount: 5, recurringRuleId: rule._id });
    expect(created.body.data.recurringRuleId).toBeUndefined();

    const updated = await api()
      .patch(`/api/transactions/${created.body.data._id}`)
      .set(auth(user.token))
      .send({ amount: 6, recurringRuleId: rule._id });
    expect(updated.body.data.recurringRuleId).toBeUndefined();

    await api()
      .post("/api/transactions/import")
      .set(auth(user.token))
      .send({ rows: [{ type: "expense", category: "Bills", amount: 7, recurringRuleId: rule._id }] });
    expect(await Transaction.countDocuments({ recurringRuleId: rule._id })).toBe(0);
  });

  it("moving a created transaction onto another run of the same rule is refused (409)", async () => {
    setToday("2026-10-30");
    const user = await newUser();
    await createRule(user, { startDate: "2026-09-01" });
    const list = await listTransactions(user, "?from=2026-09-01&to=2026-10-30&sort=date");
    const [first, second] = list.body.data;

    const res = await api()
      .patch(`/api/transactions/${second._id}`)
      .set(auth(user.token))
      .send({ date: first.date });

    expect(res.status).toBe(409);
  });
});
