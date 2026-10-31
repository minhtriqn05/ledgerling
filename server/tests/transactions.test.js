import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, findCategory, registerUser } from "./helpers.js";

let owner;
let other;
let food; // expense category of owner
let salary; // income category of owner

beforeAll(async () => {
  owner = await registerUser();
  other = await registerUser();
  food = await findCategory(owner.token, "Food");
  salary = await findCategory(owner.token, "Salary");
});

function create(token, body) {
  return api().post("/api/transactions").set(auth(token)).send(body);
}

describe("transactions CRUD", () => {
  it("needs a token (401)", async () => {
    expect((await api().get("/api/transactions")).status).toBe(401);
    expect((await api().post("/api/transactions").send({})).status).toBe(401);
  });

  it("creates a transaction (201), copying the type from its category", async () => {
    const res = await create(owner.token, {
      categoryId: salary._id,
      amount: 15000000,
      note: "  October salary ",
      date: "2026-09-05T09:00:00+07:00",
      type: "expense", // ignored: the type always comes from the category
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      type: "income",
      amount: 15000000,
      currency: "VND",
      note: "October salary",
      date: "2026-09-05T02:00:00.000Z",
    });
    expect(res.body.data.category).toMatchObject({ _id: salary._id, name: "Salary" });
    expect(res.body.data.userId).toBeUndefined();
  });

  it("reads, updates and deletes a transaction", async () => {
    const created = await create(owner.token, {
      categoryId: food._id,
      amount: 50000,
      date: "2026-09-10T12:00:00+07:00",
    });
    const id = created.body.data._id;

    const read = await api().get(`/api/transactions/${id}`).set(auth(owner.token));
    expect(read.status).toBe(200);
    expect(read.body.data.amount).toBe(50000);

    // Moving it to an income category also changes its type
    const updated = await api()
      .patch(`/api/transactions/${id}`)
      .set(auth(owner.token))
      .send({ amount: 65000, note: "Refund", categoryId: salary._id });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ amount: 65000, note: "Refund", type: "income" });
    expect(updated.body.data.category.name).toBe("Salary");

    const removed = await api().delete(`/api/transactions/${id}`).set(auth(owner.token));
    expect(removed.status).toBe(200);
    expect(removed.body.data._id).toBe(id);

    expect((await api().get(`/api/transactions/${id}`).set(auth(owner.token))).status).toBe(404);
  });

  it.each([
    [{ amount: 1000 }, "Category id is invalid"],
    [{ categoryId: "abc", amount: 1000 }, "Category id is invalid"],
    [{ amount: 0 }, "Amount must be greater than 0", true],
    [{ amount: -5 }, "Amount must be greater than 0", true],
    [{ amount: "1000" }, "Amount must be greater than 0", true],
    [{ amount: 1000, currency: "dollars" }, "Currency must be a 3-letter ISO code", true],
    [{ amount: 1000, date: "yesterday" }, "Date is invalid, use ISO 8601 like 2026-10-27T12:30:00+07:00", true],
    [{ amount: 1000, note: "x".repeat(201) }, "Note must be at most 200 characters", true],
  ])("refuses invalid input (400): %o", async (body, message, withCategory) => {
    const res = await create(owner.token, withCategory ? { categoryId: food._id, ...body } : body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message, code: expect.any(String) });
  });

  it("refuses an empty update (400)", async () => {
    const created = await create(owner.token, { categoryId: food._id, amount: 1000 });
    const res = await api()
      .patch(`/api/transactions/${created.body.data._id}`)
      .set(auth(owner.token))
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Nothing to update");
  });

  it("answers 404 for a category of another user", async () => {
    const res = await create(other.token, { categoryId: food._id, amount: 1000 });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Category not found");
  });

  it("hides another user's transaction behind a 404", async () => {
    const created = await create(owner.token, { categoryId: food._id, amount: 1234 });
    const path = `/api/transactions/${created.body.data._id}`;

    expect((await api().get(path).set(auth(other.token))).status).toBe(404);
    expect((await api().patch(path).set(auth(other.token)).send({ amount: 1 })).status).toBe(404);
    expect((await api().delete(path).set(auth(other.token))).status).toBe(404);
    expect((await api().get(path).set(auth(owner.token))).body.data.amount).toBe(1234);
  });
});

describe("month filter (Vietnam time, UTC+7)", () => {
  let user;
  let category;

  beforeAll(async () => {
    user = await registerUser();
    category = await findCategory(user.token, "Transport");
    // 23:30 on 31 Oct in Vietnam is still 31 Oct, even though it is 16:30 UTC
    await create(user.token, { categoryId: category._id, amount: 1, note: "last minute", date: "2026-10-31T23:30:00+07:00" });
    // 00:30 on 1 Nov in Vietnam is 31 Oct 17:30 UTC, but it belongs to November
    await create(user.token, { categoryId: category._id, amount: 2, note: "first minute", date: "2026-11-01T00:30:00+07:00" });
    // 00:00 on 1 Oct in Vietnam is the first moment of October
    await create(user.token, { categoryId: category._id, amount: 3, note: "midnight", date: "2026-10-01T00:00:00+07:00" });
    // 23:59 on 30 Sep in Vietnam is still September
    await create(user.token, { categoryId: category._id, amount: 4, note: "september", date: "2026-09-30T23:59:00+07:00" });
  });

  async function notesOf(month) {
    const res = await api().get(`/api/transactions?month=${month}`).set(auth(user.token));
    expect(res.status).toBe(200);
    return res.body.data.map((t) => t.note).sort();
  }

  it("puts 23:30 on the last day in that month and 00:30 on the 1st in the next one", async () => {
    expect(await notesOf("2026-10")).toEqual(["last minute", "midnight"]);
    expect(await notesOf("2026-11")).toEqual(["first minute"]);
    expect(await notesOf("2026-09")).toEqual(["september"]);
  });

  it("returns pagination meta and keeps data an array", async () => {
    const res = await api().get("/api/transactions?month=2026-10&limit=1").set(auth(user.token));
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
  });

  it("refuses a malformed month (400)", async () => {
    const res = await api().get("/api/transactions?month=2026-13").set(auth(user.token));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Month must be in YYYY-MM format");
  });
});

describe("deleting a category that still has transactions", () => {
  it("is blocked with 409, and works once the transactions are gone", async () => {
    const user = await registerUser();
    const madeUp = await api()
      .post("/api/categories")
      .set(auth(user.token))
      .send({ name: "Gym", type: "expense", color: "#334455" });
    const categoryId = madeUp.body.data._id;
    const tx = await create(user.token, { categoryId, amount: 300000 });

    const blocked = await api().delete(`/api/categories/${categoryId}`).set(auth(user.token));
    expect(blocked.status).toBe(409);
    expect(blocked.body).toEqual({ success: false, message: "Category still has transactions", code: expect.any(String) });

    await api().delete(`/api/transactions/${tx.body.data._id}`).set(auth(user.token));
    const allowed = await api().delete(`/api/categories/${categoryId}`).set(auth(user.token));
    expect(allowed.status).toBe(200);
  });
});
