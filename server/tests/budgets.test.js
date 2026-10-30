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
