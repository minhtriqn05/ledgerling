import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, findCategory, registerUser } from "./helpers.js";

let owner;

beforeAll(async () => {
  owner = await registerUser();
});

describe("category icon", () => {
  it("gives the default categories an icon", async () => {
    const res = await api().get("/api/categories").set(auth(owner.token));
    const icons = Object.fromEntries(res.body.data.map((c) => [c.name, c.icon]));
    expect(icons).toMatchObject({ Food: "utensils", Transport: "bus", Bills: "receipt", Salary: "banknote" });
    expect(res.body.data.every((c) => typeof c.icon === "string")).toBe(true);
  });

  it("creates a category with an icon, changes it and removes it", async () => {
    const created = await api()
      .post("/api/categories")
      .set(auth(owner.token))
      .send({ name: "Gym", type: "expense", color: "#223344", icon: "🏋️" });
    expect(created.status).toBe(201);
    expect(created.body.data.icon).toBe("🏋️");
    const id = created.body.data._id;

    const changed = await api().patch(`/api/categories/${id}`).set(auth(owner.token)).send({ icon: "🥗" });
    expect(changed.status).toBe(200);
    expect(changed.body.data).toMatchObject({ name: "Gym", icon: "🥗" });

    const removed = await api().patch(`/api/categories/${id}`).set(auth(owner.token)).send({ icon: null });
    expect(removed.status).toBe(200);
    expect(removed.body.data.icon).toBeNull();

    // An empty string means "no icon" too
    await api().patch(`/api/categories/${id}`).set(auth(owner.token)).send({ icon: "🥗" });
    const cleared = await api().patch(`/api/categories/${id}`).set(auth(owner.token)).send({ icon: "" });
    expect(cleared.body.data.icon).toBeNull();
  });

  it("accepts a name from the icon set, and refuses an unknown name (400)", async () => {
    const ok = await api()
      .post("/api/categories")
      .set(auth(owner.token))
      .send({ name: "Coffee shops", type: "expense", color: "#223344", icon: "coffee" });
    expect(ok.status).toBe(201);
    expect(ok.body.data.icon).toBe("coffee");

    const bad = await api()
      .patch(`/api/categories/${ok.body.data._id}`)
      .set(auth(owner.token))
      .send({ icon: "not-an-icon" });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe("ICON_INVALID");
  });

  it("keeps the icon when only the name changes", async () => {
    const created = await api()
      .post("/api/categories")
      .set(auth(owner.token))
      .send({ name: "Books", type: "expense", color: "#223344", icon: "📚" });
    const renamed = await api()
      .patch(`/api/categories/${created.body.data._id}`)
      .set(auth(owner.token))
      .send({ name: "Reading" });
    expect(renamed.body.data).toMatchObject({ name: "Reading", icon: "📚" });
  });

  it("has no icon when none is sent (null)", async () => {
    const res = await api()
      .post("/api/categories")
      .set(auth(owner.token))
      .send({ name: "Plain", type: "expense", color: "#223344" });
    expect(res.status).toBe(201);
    expect(res.body.data.icon).toBeNull();
  });

  it.each(["ab", "7", "🍜🍜", "hello 🍜", " ", 5, ["🍜"]])("refuses %j as an icon (400)", async (icon) => {
    const create = await api()
      .post("/api/categories")
      .set(auth(owner.token))
      .send({ name: "Bad icon", type: "expense", color: "#223344", icon });
    expect(create.status).toBe(400);
    expect(create.body.message).toBe("Icon must be an icon name or a single emoji");
    expect(create.body.code).toBe("ICON_INVALID");

    const food = await findCategory(owner.token, "Food");
    const update = await api().patch(`/api/categories/${food._id}`).set(auth(owner.token)).send({ icon });
    expect(update.status).toBe(400);
  });

  it("returns the icon inside a transaction", async () => {
    const food = await findCategory(owner.token, "Food");
    const res = await api()
      .post("/api/transactions")
      .set(auth(owner.token))
      .send({ categoryId: food._id, amount: 10000 });
    expect(res.status).toBe(201);
    expect(res.body.data.category).toMatchObject({ name: "Food", icon: "utensils" });
  });

  it("returns the icon in the expense per category of the stats", async () => {
    const res = await api().get("/api/stats/summary").set(auth(owner.token));
    expect(res.status).toBe(200);
    const food = res.body.data.expenseByCategory.find((c) => c.name === "Food");
    expect(food.icon).toBe("utensils");
  });

  it("deletes the templates of a deleted category", async () => {
    const pool = await api()
      .post("/api/categories")
      .set(auth(owner.token))
      .send({ name: "Pool", type: "expense", color: "#223344" });
    const template = await api()
      .post("/api/templates")
      .set(auth(owner.token))
      .send({ name: "Swim", categoryId: pool.body.data._id, amount: 30000 });
    expect(template.status).toBe(201);

    expect((await api().delete(`/api/categories/${pool.body.data._id}`).set(auth(owner.token))).status).toBe(200);
    const list = await api().get("/api/templates").set(auth(owner.token));
    expect(list.body.data.some((t) => t.name === "Swim")).toBe(false);
  });
});
