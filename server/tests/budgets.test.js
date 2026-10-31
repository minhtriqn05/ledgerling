import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, findCategory, registerUser } from "./helpers.js";

let owner;
let other;
let food;
let salary;

beforeAll(async () => {
  owner = await registerUser();
  other = await registerUser();
  food = await findCategory(owner.token, "Food");
  salary = await findCategory(owner.token, "Salary");
});

function createBudget(token, body) {
  return api().post("/api/budgets").set(auth(token)).send(body);
}

describe("budgets", () => {
  it("needs a token (401)", async () => {
    expect((await api().get("/api/budgets")).status).toBe(401);
  });

  it("creates a budget with its progress, and warns at 80%", async () => {
    // 850,000 spent of 1,000,000 = 85% -> warning
    await api()
      .post("/api/transactions")
      .set(auth(owner.token))
      .send({ categoryId: food._id, amount: 850000, date: "2026-10-05T12:00:00+07:00" });

    const res = await createBudget(owner.token, { categoryId: food._id, month: "2026-10", amount: 1000000 });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      month: "2026-10",
      amount: 1000000,
      spent: 850000,
      remaining: 150000,
      percent: 85,
      status: "warning",
    });
    expect(res.body.data.category.name).toBe("Food");
  });

  it("refuses a second budget for the same category and month (409)", async () => {
    const res = await createBudget(owner.token, { categoryId: food._id, month: "2026-10", amount: 5 });
    expect(res.status).toBe(409);
  });

  it("refuses an income category (400) and a bad month (400)", async () => {
    const income = await createBudget(owner.token, { categoryId: salary._id, month: "2026-10", amount: 5 });
    expect(income.status).toBe(400);
    expect(income.body.message).toBe("Budgets are only for expense categories");

    const month = await createBudget(owner.token, { categoryId: food._id, month: "10-2026", amount: 5 });
    expect(month.status).toBe(400);
  });

  it("marks a budget as over at 100%", async () => {
    const list = await api().get("/api/budgets?month=2026-10").set(auth(owner.token));
    const id = list.body.data[0]._id;

    const res = await api().patch(`/api/budgets/${id}`).set(auth(owner.token)).send({ amount: 850000 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ percent: 100, status: "over", remaining: 0 });
  });

  it("copies budgets to another month, skipping the ones that exist", async () => {
    const first = await api()
      .post("/api/budgets/copy")
      .set(auth(owner.token))
      .send({ fromMonth: "2026-10", toMonth: "2026-11" });
    expect(first.body.data).toEqual({ copied: 1 });

    const again = await api()
      .post("/api/budgets/copy")
      .set(auth(owner.token))
      .send({ fromMonth: "2026-10", toMonth: "2026-11" });
    expect(again.body.data).toEqual({ copied: 0 });
  });

  it("hides another user's budget behind a 404", async () => {
    const list = await api().get("/api/budgets?month=2026-10").set(auth(owner.token));
    const path = `/api/budgets/${list.body.data[0]._id}`;

    expect((await api().patch(path).set(auth(other.token)).send({ amount: 1 })).status).toBe(404);
    expect((await api().delete(path).set(auth(other.token))).status).toBe(404);
    expect((await api().get("/api/budgets?month=2026-10").set(auth(other.token))).body.data).toEqual([]);
  });

  it("deletes the category's budgets when the category is deleted", async () => {
    const user = await registerUser();
    const made = await api()
      .post("/api/categories")
      .set(auth(user.token))
      .send({ name: "Pets", type: "expense", color: "#445566" });
    await createBudget(user.token, { categoryId: made.body.data._id, month: "2026-10", amount: 100 });

    const removed = await api().delete(`/api/categories/${made.body.data._id}`).set(auth(user.token));
    expect(removed.status).toBe(200);
    expect((await api().get("/api/budgets?month=2026-10").set(auth(user.token))).body.data).toEqual([]);
  });
});

function addTransaction(token, body) {
  return api().post("/api/transactions").set(auth(token)).send(body);
}

function listBudgets(token, month) {
  return api().get(`/api/budgets?month=${month}`).set(auth(token));
}

describe("budgets: spent, percent and status (hand-calculated)", () => {
  let user;
  let food;
  let transport;
  let budgetId;

  beforeAll(async () => {
    user = await registerUser();
    food = await findCategory(user.token, "Food");
    transport = await findCategory(user.token, "Transport");

    // Food in October 2026 (Vietnam time). Only the first two and the last one count: 1,000,000 + 500,000 + 250,000.
    await addTransaction(user.token, { categoryId: food._id, amount: 1000000, date: "2026-10-01T00:00:00+07:00" }); // first moment of the month
    await addTransaction(user.token, { categoryId: food._id, amount: 500000, date: "2026-10-31T23:59:59+07:00" }); // last second of the month
    await addTransaction(user.token, { categoryId: food._id, amount: 700000, date: "2026-09-30T23:59:59+07:00" }); // September
    await addTransaction(user.token, { categoryId: food._id, amount: 900000, date: "2026-11-01T00:00:00+07:00" }); // November
    await addTransaction(user.token, { categoryId: food._id, amount: 40, currency: "USD", date: "2026-10-10T12:00:00+07:00" }); // not VND
    await addTransaction(user.token, { categoryId: food._id, amount: 250000, date: "2026-10-20T12:00:00+07:00" });
    // Another category: must not change the Food budget
    await addTransaction(user.token, { categoryId: transport._id, amount: 400000, date: "2026-10-12T12:00:00+07:00" });

    const created = await createBudget(user.token, { categoryId: food._id, month: "2026-10", amount: 3000000 });
    budgetId = created.body.data._id;
  });

  it("counts only the VND expenses of this category inside the month", async () => {
    const res = await listBudgets(user.token, "2026-10");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    // 1,750,000 / 3,000,000 = 58.33...%
    expect(res.body.data[0]).toMatchObject({ spent: 1750000, remaining: 1250000, percent: 58.3, status: "ok" });
  });

  it("is still ok one dong below 80%, even though the percent is shown as 80", async () => {
    // 3,000,000 x 80% = 2,400,000. Spent 1,750,000 + 649,999 = 2,399,999 -> 79.99997%
    await addTransaction(user.token, { categoryId: food._id, amount: 649999, date: "2026-10-21T12:00:00+07:00" });

    const [budget] = (await listBudgets(user.token, "2026-10")).body.data;
    expect(budget).toMatchObject({ spent: 2399999, remaining: 600001, percent: 80, status: "ok" });
  });

  it("turns to warning at exactly 80%", async () => {
    await addTransaction(user.token, { categoryId: food._id, amount: 1, date: "2026-10-22T12:00:00+07:00" });

    const [budget] = (await listBudgets(user.token, "2026-10")).body.data;
    expect(budget).toMatchObject({ spent: 2400000, remaining: 600000, percent: 80, status: "warning" });
  });

  it("stays warning one dong below 100%", async () => {
    await addTransaction(user.token, { categoryId: food._id, amount: 599999, date: "2026-10-23T12:00:00+07:00" });

    const [budget] = (await listBudgets(user.token, "2026-10")).body.data;
    expect(budget).toMatchObject({ spent: 2999999, remaining: 1, percent: 100, status: "warning" });
  });

  it("turns to over at exactly 100%, and remaining goes negative after that", async () => {
    await addTransaction(user.token, { categoryId: food._id, amount: 1, date: "2026-10-24T12:00:00+07:00" });
    let [budget] = (await listBudgets(user.token, "2026-10")).body.data;
    expect(budget).toMatchObject({ spent: 3000000, remaining: 0, percent: 100, status: "over" });

    await addTransaction(user.token, { categoryId: food._id, amount: 300000, date: "2026-10-25T12:00:00+07:00" });
    [budget] = (await listBudgets(user.token, "2026-10")).body.data;
    expect(budget).toMatchObject({ spent: 3300000, remaining: -300000, percent: 110, status: "over" });
  });

  it("shows a month without budgets as an empty list, and the other months are not affected", async () => {
    expect((await listBudgets(user.token, "2026-09")).body.data).toEqual([]);
    expect((await listBudgets(user.token, "2026-11")).body.data).toEqual([]);
  });

  it("updates the amount and recalculates the progress", async () => {
    // 3,300,000 spent of 6,600,000 = 50%
    const res = await api().patch(`/api/budgets/${budgetId}`).set(auth(user.token)).send({ amount: 6600000 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ amount: 6600000, spent: 3300000, remaining: 3300000, percent: 50, status: "ok" });
  });

  it("deletes a budget and leaves its transactions alone", async () => {
    const res = await api().delete(`/api/budgets/${budgetId}`).set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ _id: budgetId });

    expect((await listBudgets(user.token, "2026-10")).body.data).toEqual([]);
    const transactions = await api().get("/api/transactions?month=2026-10").set(auth(user.token));
    expect(transactions.body.data.length).toBeGreaterThan(0);
  });
});

describe("budgets: input checks and access", () => {
  let user;
  let stranger;
  let food;
  let strangerFood;
  let transport;

  beforeAll(async () => {
    user = await registerUser();
    stranger = await registerUser();
    food = await findCategory(user.token, "Food");
    transport = await findCategory(user.token, "Transport");
    strangerFood = await findCategory(stranger.token, "Food");
  });

  it("answers 401 without a token on every route", async () => {
    const id = "6720d1b2c3d4e5f601234580";
    const calls = [
      api().get("/api/budgets"),
      api().post("/api/budgets").send({}),
      api().post("/api/budgets/copy").send({}),
      api().patch(`/api/budgets/${id}`).send({ amount: 1 }),
      api().delete(`/api/budgets/${id}`),
    ];
    for (const call of calls) expect((await call).status).toBe(401);
  });

  it("answers 400 for a bad month in the list", async () => {
    for (const month of ["2026-13", "2026-1", "october", "2026-10-01"]) {
      const res = await api().get(`/api/budgets?month=${month}`).set(auth(user.token));
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ success: false, message: "Month must be in YYYY-MM format", code: expect.any(String) });
    }
  });

  it("answers 400 for a bad category id, month or amount on create", async () => {
    const bad = [
      { categoryId: "abc", month: "2026-10", amount: 100 },
      { categoryId: food._id, month: "2026-00", amount: 100 },
      { categoryId: food._id, month: "2026-10", amount: 0 },
      { categoryId: food._id, month: "2026-10", amount: -5 },
      { categoryId: food._id, month: "2026-10", amount: "100" },
      { month: "2026-10", amount: 100 },
    ];
    for (const body of bad) expect((await createBudget(user.token, body)).status).toBe(400);
  });

  it("answers 404 when the category belongs to another user", async () => {
    const res = await createBudget(user.token, { categoryId: strangerFood._id, month: "2026-10", amount: 100 });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Category not found");
  });

  it("ignores a userId sent in the body", async () => {
    const res = await createBudget(user.token, {
      categoryId: transport._id,
      month: "2026-10",
      amount: 100,
      userId: stranger.user._id,
    });
    expect(res.status).toBe(201);
    expect((await listBudgets(user.token, "2026-10")).body.data).toHaveLength(1);
    expect((await listBudgets(stranger.token, "2026-10")).body.data).toEqual([]);
  });

  it("answers 400 when updating something other than the amount", async () => {
    const [budget] = (await listBudgets(user.token, "2026-10")).body.data;
    const path = `/api/budgets/${budget._id}`;

    expect((await api().patch(path).set(auth(user.token)).send({})).status).toBe(400);
    expect((await api().patch(path).set(auth(user.token)).send({ month: "2026-11" })).status).toBe(400);
    expect((await api().patch(path).set(auth(user.token)).send({ categoryId: food._id })).status).toBe(400);
    expect((await api().patch(path).set(auth(user.token)).send({ amount: 0 })).status).toBe(400);
  });

  it("answers 404 for an unknown or malformed budget id", async () => {
    expect((await api().patch("/api/budgets/6720d1b2c3d4e5f601234580").set(auth(user.token)).send({ amount: 1 })).status).toBe(404);
    expect((await api().delete("/api/budgets/not-an-id").set(auth(user.token))).status).toBe(404);
  });

  it("answers 400 for a bad copy request", async () => {
    const copy = (body) => api().post("/api/budgets/copy").set(auth(user.token)).send(body);

    expect((await copy({ fromMonth: "2026-10" })).status).toBe(400);
    expect((await copy({ fromMonth: "2026-10", toMonth: "11-2026" })).status).toBe(400);
    expect((await copy({ fromMonth: "2026-10", toMonth: "2026-10" })).status).toBe(400);
  });

  it("copies only my own budgets, and an empty month copies nothing", async () => {
    // stranger has no budgets in 2026-10, so copying must not take the user's budget
    const res = await api()
      .post("/api/budgets/copy")
      .set(auth(stranger.token))
      .send({ fromMonth: "2026-10", toMonth: "2026-12" });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ copied: 0 });
    expect((await listBudgets(stranger.token, "2026-12")).body.data).toEqual([]);
  });

  it("keeps the amount of an existing budget when copying", async () => {
    const [source] = (await listBudgets(user.token, "2026-10")).body.data;
    await createBudget(user.token, { categoryId: source.category._id, month: "2026-11", amount: 777 });

    const res = await api()
      .post("/api/budgets/copy")
      .set(auth(user.token))
      .send({ fromMonth: "2026-10", toMonth: "2026-11" });
    expect(res.body.data).toEqual({ copied: 0 });
    expect((await listBudgets(user.token, "2026-11")).body.data[0].amount).toBe(777);
  });
});
