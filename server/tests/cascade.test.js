import { describe, expect, it } from "vitest";
import Budget from "../src/models/Budget.js";
import TransactionTemplate from "../src/models/TransactionTemplate.js";
import { currentMonth } from "../src/utils/month.js";
import { api, auth, registerUser } from "./helpers.js";

// Deleting a category takes its budgets and templates with it (they mean nothing without it), and is refused while
// transactions or recurring rules still use it. A refused delete must leave the budgets and templates in place.

const MONTH = currentMonth();

async function setUp() {
  const user = await registerUser();
  const send = (method, path, body) => api()[method](path).set(auth(user.token)).send(body);
  const pets = (await send("post", "/api/categories", { name: "Pets", type: "expense", color: "#445566" })).body.data;
  const kept = (await send("post", "/api/categories", { name: "Garden", type: "expense", color: "#22ADA3" })).body.data;
  for (const category of [pets, kept]) {
    await send("post", "/api/budgets", { categoryId: category._id, month: MONTH, amount: 100000 });
    await send("post", "/api/templates", { name: `${category.name} food`, categoryId: category._id, amount: 50000 });
  }
  return { user, send, pets, kept };
}

const countFor = async (model, user, category) => model.countDocuments({ userId: user.user._id, categoryId: category._id });

describe("deleting a category", () => {
  it("deletes its budgets and templates, and only those", async () => {
    const { user, send, pets, kept } = await setUp();

    const res = await send("delete", `/api/categories/${pets._id}`);
    expect(res.status).toBe(200);
    expect(await countFor(Budget, user, pets)).toBe(0);
    expect(await countFor(TransactionTemplate, user, pets)).toBe(0);
    expect(await countFor(Budget, user, kept)).toBe(1);
    expect(await countFor(TransactionTemplate, user, kept)).toBe(1);
  });

  it("is refused while a transaction uses it (409 CATEGORY_IN_USE) and then keeps its budgets and templates", async () => {
    const { user, send, pets } = await setUp();
    await send("post", "/api/transactions", { categoryId: pets._id, amount: 1000 });

    const res = await send("delete", `/api/categories/${pets._id}`);
    expect([res.status, res.body.code]).toEqual([409, "CATEGORY_IN_USE"]);
    expect(await countFor(Budget, user, pets)).toBe(1);
    expect(await countFor(TransactionTemplate, user, pets)).toBe(1);
  });

  it("is refused while a recurring rule uses it (409 CATEGORY_HAS_RULES) and then keeps its budgets and templates", async () => {
    const { user, send, pets } = await setUp();
    await send("post", "/api/recurring", { categoryId: pets._id, amount: 1000, frequency: "monthly", startDate: "2099-01-01" });

    const res = await send("delete", `/api/categories/${pets._id}`);
    expect([res.status, res.body.code]).toEqual([409, "CATEGORY_HAS_RULES"]);
    expect(await countFor(Budget, user, pets)).toBe(1);
    expect(await countFor(TransactionTemplate, user, pets)).toBe(1);
  });
});
