import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, findCategory, registerUser } from "./helpers.js";

let owner;
let other; // a second user, to check that one user cannot see or use another user's data
let food; // the owner's categories
let salary;
let otherFood;

beforeAll(async () => {
  owner = await registerUser();
  other = await registerUser();
  food = await findCategory(owner.token, "Food");
  salary = await findCategory(owner.token, "Salary");
  otherFood = await findCategory(other.token, "Food");
});

const create = (token, body) => api().post("/api/templates").set(auth(token)).send(body);

describe("POST /api/templates", () => {
  it("creates a template and returns it with its category", async () => {
    const res = await create(owner.token, { name: " Morning coffee ", categoryId: food._id, amount: 35000, note: " Coffee " });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ name: "Morning coffee", amount: 35000, note: "Coffee" });
    expect(res.body.data.category).toMatchObject({ _id: food._id, name: "Food", icon: "utensils", type: "expense" });
    expect(res.body.data.userId).toBeUndefined();
    expect(res.body.data.categoryId).toBeUndefined();
  });

  it("works without a note (empty note)", async () => {
    const res = await create(owner.token, { name: "Pay day", categoryId: salary._id, amount: 15000000 });
    expect(res.status).toBe(201);
    expect(res.body.data.note).toBe("");
  });

  it("needs a token (401)", async () => {
    const res = await api().post("/api/templates").send({ name: "x", categoryId: food._id, amount: 1 });
    expect(res.status).toBe(401);
  });

  // categoryId "CAT" is replaced by a real category id below
  it.each([
    ["no name", { categoryId: "CAT", amount: 1000 }, "Name is required"],
    ["a blank name", { name: "   ", categoryId: "CAT", amount: 1000 }, "Name is required"],
    ["a name over 40 characters", { name: "x".repeat(41), categoryId: "CAT", amount: 1000 }, "Name must be at most 40 characters"],
    ["no category", { name: "A", amount: 1000 }, "Category id is invalid"],
    ["a malformed category id", { name: "A", categoryId: "123", amount: 1000 }, "Category id is invalid"],
    ["no amount", { name: "A", categoryId: "CAT" }, "Amount must be greater than 0"],
    ["a zero amount", { name: "A", categoryId: "CAT", amount: 0 }, "Amount must be greater than 0"],
    ["an amount as text", { name: "A", categoryId: "CAT", amount: "5000" }, "Amount must be greater than 0"],
    ["a note over 200 characters", { name: "A", categoryId: "CAT", amount: 1000, note: "n".repeat(201) }, "Note must be at most 200 characters"],
  ])("refuses %s (400)", async (_label, body, message) => {
    const res = await create(owner.token, { ...body, categoryId: body.categoryId === "CAT" ? food._id : body.categoryId });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message, code: expect.any(String) });
  });

  it("answers 404 for a category of another user", async () => {
    const res = await create(owner.token, { name: "Sneaky", categoryId: otherFood._id, amount: 1000 });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Category not found");
  });

  it("ignores a userId sent in the body", async () => {
    const res = await create(owner.token, { name: "Mine", categoryId: food._id, amount: 1000, userId: other.user._id });
    expect(res.status).toBe(201);
    const otherList = await api().get("/api/templates").set(auth(other.token));
    expect(otherList.body.data).toEqual([]);
  });
});

describe("GET /api/templates", () => {
  it("lists only my templates, oldest first", async () => {
    const mine = await registerUser();
    const category = await findCategory(mine.token, "Transport");
    await create(mine.token, { name: "First", categoryId: category._id, amount: 1000 });
    await create(mine.token, { name: "Second", categoryId: category._id, amount: 2000 });

    const res = await api().get("/api/templates").set(auth(mine.token));
    expect(res.status).toBe(200);
    expect(res.body.data.map((t) => t.name)).toEqual(["First", "Second"]);
  });

  it("returns an empty array for a new user", async () => {
    const fresh = await registerUser();
    const res = await api().get("/api/templates").set(auth(fresh.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("needs a token (401)", async () => {
    expect((await api().get("/api/templates")).status).toBe(401);
  });
});

describe("GET, PATCH and DELETE /api/templates/:id", () => {
  let id;

  beforeAll(async () => {
    const res = await create(owner.token, { name: "Lunch", categoryId: food._id, amount: 50000, note: "Noodles" });
    id = res.body.data._id;
  });

  it("reads, updates and deletes a template", async () => {
    const read = await api().get(`/api/templates/${id}`).set(auth(owner.token));
    expect(read.status).toBe(200);
    expect(read.body.data.name).toBe("Lunch");

    const updated = await api()
      .patch(`/api/templates/${id}`)
      .set(auth(owner.token))
      .send({ name: "Big lunch", amount: 80000, categoryId: salary._id, note: "" });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ name: "Big lunch", amount: 80000, note: "" });
    expect(updated.body.data.category).toMatchObject({ name: "Salary", type: "income" });

    const removed = await api().delete(`/api/templates/${id}`).set(auth(owner.token));
    expect(removed.status).toBe(200);
    expect(removed.body.data._id).toBe(id);
    expect((await api().get(`/api/templates/${id}`).set(auth(owner.token))).status).toBe(404);
  });

  it("refuses an empty update and bad values (400)", async () => {
    const created = await create(owner.token, { name: "Tmp", categoryId: food._id, amount: 1000 });
    const tmp = created.body.data._id;
    const patch = (body) => api().patch(`/api/templates/${tmp}`).set(auth(owner.token)).send(body);

    expect((await patch({})).body.message).toBe("Nothing to update");
    expect((await patch({ amount: -5 })).status).toBe(400);
    expect((await patch({ name: "" })).status).toBe(400);
    expect((await patch({ categoryId: "nope" })).status).toBe(400);
  });

  it("answers 404 when the new category belongs to another user", async () => {
    const created = await create(owner.token, { name: "Keep", categoryId: food._id, amount: 1000 });
    const res = await api()
      .patch(`/api/templates/${created.body.data._id}`)
      .set(auth(owner.token))
      .send({ categoryId: otherFood._id });
    expect(res.status).toBe(404);
  });

  it("answers 404 for a malformed id", async () => {
    expect((await api().get("/api/templates/123").set(auth(owner.token))).status).toBe(404);
  });

  it("needs a token (401)", async () => {
    expect((await api().get(`/api/templates/${id}`)).status).toBe(401);
    expect((await api().patch(`/api/templates/${id}`).send({ amount: 5 })).status).toBe(401);
    expect((await api().delete(`/api/templates/${id}`)).status).toBe(401);
  });

  it("hides another user's template behind a 404 for read, update and delete", async () => {
    const created = await create(owner.token, { name: "Private", categoryId: food._id, amount: 1000 });
    const path = `/api/templates/${created.body.data._id}`;

    expect((await api().get(path).set(auth(other.token))).status).toBe(404);
    expect((await api().patch(path).set(auth(other.token)).send({ name: "Mine now" })).status).toBe(404);
    expect((await api().delete(path).set(auth(other.token))).status).toBe(404);

    // Still there, unchanged, for its owner
    const still = await api().get(path).set(auth(owner.token));
    expect(still.status).toBe(200);
    expect(still.body.data.name).toBe("Private");
  });
});
