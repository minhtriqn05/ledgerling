import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, findCategory, registerUser } from "./helpers.js";

let owner;
let other; // a second user, to check that bulk actions never touch another user's data
let food;
let transport;
let salary;
let otherFood;

beforeAll(async () => {
  owner = await registerUser();
  other = await registerUser();
  food = await findCategory(owner.token, "Food");
  transport = await findCategory(owner.token, "Transport");
  salary = await findCategory(owner.token, "Salary");
  otherFood = await findCategory(other.token, "Food");
});

// Creates `count` transactions in the category and returns their ids
async function seed(token, category, count, note = "bulk") {
  const ids = [];
  for (let i = 0; i < count; i += 1) {
    const res = await api()
      .post("/api/transactions")
      .set(auth(token))
      .send({ categoryId: category._id, amount: 1000 + i, note });
    ids.push(res.body.data._id);
  }
  return ids;
}

// Valid-looking ids that match nothing
const fakeIds = (count) => Array.from({ length: count }, (_, i) => i.toString(16).padStart(24, "0"));

const bulkDelete = (token, body) => api().post("/api/transactions/bulk-delete").set(auth(token)).send(body);
const bulkCategory = (token, body) => api().patch("/api/transactions/bulk-category").set(auth(token)).send(body);
const getOne = (token, id) => api().get(`/api/transactions/${id}`).set(auth(token));

describe("POST /api/transactions/bulk-delete", () => {
  it("deletes the listed transactions and says how many", async () => {
    const ids = await seed(owner.token, food, 3);
    const keep = await seed(owner.token, food, 1);

    const res = await bulkDelete(owner.token, { ids: ids.slice(0, 2) });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { deleted: 2 } });

    expect((await getOne(owner.token, ids[0])).status).toBe(404);
    expect((await getOne(owner.token, ids[1])).status).toBe(404);
    expect((await getOne(owner.token, ids[2])).status).toBe(200); // not in the list
    expect((await getOne(owner.token, keep[0])).status).toBe(200);
  });

  it("counts a duplicated id once", async () => {
    const [id] = await seed(owner.token, food, 1);
    const res = await bulkDelete(owner.token, { ids: [id, id] });
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(1);
  });

  it("never deletes another user's transactions (they are skipped, not an error)", async () => {
    const mine = await seed(owner.token, food, 1);
    const theirs = await seed(other.token, otherFood, 2);

    const res = await bulkDelete(owner.token, { ids: [...mine, ...theirs] });
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(1);

    for (const id of theirs) expect((await getOne(other.token, id)).status).toBe(200);
  });

  it("deletes nothing and answers 200 with 0 when no id is mine", async () => {
    const theirs = await seed(other.token, otherFood, 1);
    const res = await bulkDelete(owner.token, { ids: theirs });
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(0);
    expect((await getOne(other.token, theirs[0])).status).toBe(200);
  });

  it("accepts exactly 200 ids and refuses 201 (400)", async () => {
    const ok = await bulkDelete(owner.token, { ids: fakeIds(200) });
    expect(ok.status).toBe(200);
    expect(ok.body.data.deleted).toBe(0);

    const tooMany = await bulkDelete(owner.token, { ids: fakeIds(201) });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body).toEqual({ success: false, message: "You can change at most 200 transactions at a time", code: expect.any(String) });
  });

  it("does not delete anything when there are too many ids", async () => {
    const [mine] = await seed(owner.token, food, 1);
    expect((await bulkDelete(owner.token, { ids: [mine, ...fakeIds(200)] })).status).toBe(400);
    expect((await getOne(owner.token, mine)).status).toBe(200);
  });

  it.each([
    ["no body", undefined],
    ["no ids", {}],
    ["ids that is not an array", { ids: "abc" }],
    ["an empty array", { ids: [] }],
    ["a malformed id", { ids: ["123"] }],
    ["an id that is not a string", { ids: [5] }],
  ])("refuses %s (400)", async (_label, body) => {
    const res = await bulkDelete(owner.token, body);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("needs a token (401)", async () => {
    const res = await api().post("/api/transactions/bulk-delete").send({ ids: [] });
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/transactions/bulk-category", () => {
  it("moves the listed transactions to the new category and says how many changed", async () => {
    const ids = await seed(owner.token, food, 3);

    const res = await bulkCategory(owner.token, { ids: ids.slice(0, 2), categoryId: transport._id });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { updated: 2 } });

    expect((await getOne(owner.token, ids[0])).body.data.category).toMatchObject({ _id: transport._id, name: "Transport" });
    expect((await getOne(owner.token, ids[1])).body.data.category._id).toBe(transport._id);
    expect((await getOne(owner.token, ids[2])).body.data.category._id).toBe(food._id); // not in the list
  });

  it("copies the type of the new category (expense to income)", async () => {
    const ids = await seed(owner.token, food, 2);
    const res = await bulkCategory(owner.token, { ids, categoryId: salary._id });
    expect(res.status).toBe(200);
    expect(res.body.data.updated).toBe(2);

    const moved = await getOne(owner.token, ids[0]);
    expect(moved.body.data.type).toBe("income");
    expect(moved.body.data.category.name).toBe("Salary");
  });

  it("does not count a transaction that already has the category", async () => {
    const ids = await seed(owner.token, transport, 2);
    const res = await bulkCategory(owner.token, { ids, categoryId: transport._id });
    expect(res.status).toBe(200);
    expect(res.body.data.updated).toBe(0);
  });

  it("never changes another user's transactions", async () => {
    const mine = await seed(owner.token, food, 1);
    const theirs = await seed(other.token, otherFood, 2);

    const res = await bulkCategory(owner.token, { ids: [...mine, ...theirs], categoryId: transport._id });
    expect(res.status).toBe(200);
    expect(res.body.data.updated).toBe(1);

    for (const id of theirs) {
      const t = await getOne(other.token, id);
      expect(t.body.data.category._id).toBe(otherFood._id);
    }
  });

  it("answers 404 and changes nothing when the category belongs to another user", async () => {
    const ids = await seed(owner.token, food, 1);
    const res = await bulkCategory(owner.token, { ids, categoryId: otherFood._id });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Category not found");
    expect((await getOne(owner.token, ids[0])).body.data.category._id).toBe(food._id);
  });

  it("answers 404 for a category id that does not exist", async () => {
    const ids = await seed(owner.token, food, 1);
    const res = await bulkCategory(owner.token, { ids, categoryId: "0".repeat(24) });
    expect(res.status).toBe(404);
  });

  it("refuses more than 200 ids (400)", async () => {
    const res = await bulkCategory(owner.token, { ids: fakeIds(201), categoryId: transport._id });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("You can change at most 200 transactions at a time");
  });

  // categoryId "CAT" is replaced by a real category id below
  it.each([
    ["no ids", { categoryId: "CAT" }, "Ids must be a non-empty array"],
    ["an empty array", { ids: [], categoryId: "CAT" }, "Ids must be a non-empty array"],
    ["a malformed id", { ids: ["x"], categoryId: "CAT" }, "Every id must be a valid transaction id"],
    ["no category", { ids: ["0".repeat(24)] }, "Category id is invalid"],
    ["a malformed category", { ids: ["0".repeat(24)], categoryId: "nope" }, "Category id is invalid"],
  ])("refuses %s (400)", async (_label, body, message) => {
    const res = await bulkCategory(owner.token, { ...body, categoryId: body.categoryId === "CAT" ? transport._id : body.categoryId });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message, code: expect.any(String) });
  });

  it("needs a token (401)", async () => {
    const res = await api().patch("/api/transactions/bulk-category").send({ ids: [], categoryId: transport._id });
    expect(res.status).toBe(401);
  });

  it("is not mistaken for PATCH /transactions/:id", async () => {
    // "bulk-category" is not an id: this route must win and validate the body (400), not answer 404 "Transaction not found"
    const res = await api().patch("/api/transactions/bulk-category").set(auth(owner.token)).send({});
    expect(res.status).toBe(400);
  });
});
