import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, findCategory, registerUser } from "./helpers.js";

let owner; // { token, user }
let other; // a second user, to check that one user cannot see another's data

beforeAll(async () => {
  owner = await registerUser();
  other = await registerUser();
});

describe("default categories", () => {
  it("creates 5 expense and 2 income categories at sign-up", async () => {
    const res = await api().get("/api/categories").set(auth(owner.token));

    expect(res.status).toBe(200);
    const names = res.body.data.map((c) => `${c.type}:${c.name}`).sort();
    expect(names).toEqual(
      [
        "expense:Bills",
        "expense:Entertainment",
        "expense:Food",
        "expense:Shopping",
        "expense:Transport",
        "income:Other Income",
        "income:Salary",
      ].sort()
    );
    expect(res.body.data[0].userId).toBeUndefined();
  });

  it("filters by type", async () => {
    const res = await api().get("/api/categories?type=income").set(auth(owner.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((c) => c.type === "income")).toBe(true);
  });

  it("refuses an unknown type filter (400)", async () => {
    const res = await api().get("/api/categories?type=gift").set(auth(owner.token));
    expect(res.status).toBe(400);
  });
});

describe("categories CRUD", () => {
  it("needs a token (401)", async () => {
    const res = await api().get("/api/categories");
    expect(res.status).toBe(401);
  });

  it("creates, reads, updates and deletes a category", async () => {
    const created = await api()
      .post("/api/categories")
      .set(auth(owner.token))
      .send({ name: " Coffee ", type: "expense", color: "#AA5500" });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ name: "Coffee", type: "expense", color: "#AA5500" });
    const id = created.body.data._id;

    const read = await api().get(`/api/categories/${id}`).set(auth(owner.token));
    expect(read.status).toBe(200);
    expect(read.body.data.name).toBe("Coffee");

    const updated = await api()
      .patch(`/api/categories/${id}`)
      .set(auth(owner.token))
      .send({ name: "Cafe", color: "#112233" });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ name: "Cafe", color: "#112233", type: "expense" });

    const removed = await api().delete(`/api/categories/${id}`).set(auth(owner.token));
    expect(removed.status).toBe(200);
    expect(removed.body.data._id).toBe(id);

    const gone = await api().get(`/api/categories/${id}`).set(auth(owner.token));
    expect(gone.status).toBe(404);
  });

  it("refuses a duplicate name of the same type (409), ignoring case", async () => {
    const res = await api()
      .post("/api/categories")
      .set(auth(owner.token))
      .send({ name: "food", type: "expense", color: "#123456" });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ success: false, message: "Category already exists", code: expect.any(String) });
  });

  it("allows the same name with the other type", async () => {
    const res = await api()
      .post("/api/categories")
      .set(auth(owner.token))
      .send({ name: "Food", type: "income", color: "#123456" });
    expect(res.status).toBe(201);
  });

  it("refuses renaming to a name that is already used (409)", async () => {
    const transport = await findCategory(owner.token, "Transport");
    const res = await api()
      .patch(`/api/categories/${transport._id}`)
      .set(auth(owner.token))
      .send({ name: "Bills" });
    expect(res.status).toBe(409);
  });

  it.each(["red", "#12345", "#GGGGGG", ""])("refuses an invalid color %j (400)", async (color) => {
    const res = await api()
      .post("/api/categories")
      .set(auth(owner.token))
      .send({ name: `Color ${color}`, type: "expense", color });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Color must be a hex code like #FF7043");
  });

  it("refuses changing the type (400)", async () => {
    const food = await findCategory(owner.token, "Food");
    const res = await api()
      .patch(`/api/categories/${food._id}`)
      .set(auth(owner.token))
      .send({ type: "income" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Type cannot be changed");
  });

  it("ignores a userId sent in the body", async () => {
    const res = await api()
      .post("/api/categories")
      .set(auth(owner.token))
      .send({ name: "Sneaky", type: "expense", color: "#123456", userId: other.user._id });
    expect(res.status).toBe(201);

    const otherList = await api().get("/api/categories").set(auth(other.token));
    expect(otherList.body.data.some((c) => c.name === "Sneaky")).toBe(false);
  });

  it("answers 404 for a malformed id", async () => {
    const res = await api().get("/api/categories/123").set(auth(owner.token));
    expect(res.status).toBe(404);
  });
});

describe("another user's category", () => {
  it("is hidden behind a 404 for read, update and delete", async () => {
    const food = await findCategory(owner.token, "Food");
    const path = `/api/categories/${food._id}`;

    expect((await api().get(path).set(auth(other.token))).status).toBe(404);
    expect(
      (await api().patch(path).set(auth(other.token)).send({ name: "Mine now" })).status
    ).toBe(404);
    expect((await api().delete(path).set(auth(other.token))).status).toBe(404);

    // Still there for its owner
    expect((await api().get(path).set(auth(owner.token))).body.data.name).toBe("Food");
  });
});
