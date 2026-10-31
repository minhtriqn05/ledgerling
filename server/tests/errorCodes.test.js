import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, registerUser } from "./helpers.js";

// Every error answer has a stable `code` next to the English message, so the client can translate it.

let user;

beforeAll(async () => {
  user = await registerUser();
});

describe("error codes", () => {
  it("EMAIL_TAKEN for an email that is already registered", async () => {
    const res = await api().post("/api/auth/register").send({ name: "A", email: user.email, password: "secret123" });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ success: false, message: "Email is already registered", code: "EMAIL_TAKEN", code: expect.any(String) });
  });

  it("INVALID_CREDENTIALS for a wrong password", async () => {
    const res = await api().post("/api/auth/login").send({ email: user.email, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: "Invalid email or password", code: "INVALID_CREDENTIALS", code: expect.any(String) });
  });

  it("TOKEN_MISSING without a token and TOKEN_INVALID with a bad one", async () => {
    const missing = await api().get("/api/categories");
    expect(missing.status).toBe(401);
    expect(missing.body.code).toBe("TOKEN_MISSING");

    const invalid = await api().get("/api/categories").set(auth("not-a-token"));
    expect(invalid.status).toBe(401);
    expect(invalid.body.code).toBe("TOKEN_INVALID");
  });

  it("CATEGORY_EXISTS and CATEGORY_IN_USE", async () => {
    const categories = (await api().get("/api/categories").set(auth(user.token))).body.data;
    const food = categories.find((c) => c.name === "Food");

    const duplicate = await api()
      .post("/api/categories")
      .set(auth(user.token))
      .send({ name: "food", type: "expense", color: "#223344" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe("CATEGORY_EXISTS");

    await api().post("/api/transactions").set(auth(user.token)).send({ categoryId: food._id, amount: 1000 });
    const inUse = await api().delete(`/api/categories/${food._id}`).set(auth(user.token));
    expect(inUse.status).toBe(409);
    expect(inUse.body.code).toBe("CATEGORY_IN_USE");
  });

  it("a specific code for a field the form can get wrong, VALIDATION_ERROR for the rest", async () => {
    const amount = await api().post("/api/transactions").set(auth(user.token)).send({ amount: 0 });
    expect(amount.status).toBe(400);
    expect(amount.body.code).toBe("VALIDATION_ERROR"); // the category id is checked first

    const categories = (await api().get("/api/categories").set(auth(user.token))).body.data;
    const zero = await api()
      .post("/api/transactions")
      .set(auth(user.token))
      .send({ categoryId: categories[0]._id, amount: 0 });
    expect(zero.body.code).toBe("AMOUNT_INVALID");

    const page = await api().get("/api/transactions?page=0").set(auth(user.token));
    expect(page.status).toBe(400);
    expect(page.body.code).toBe("VALIDATION_ERROR");
    expect(page.body.message).toBe("Page must be a whole number from 1");
  });

  it("TRANSACTION_NOT_FOUND, ROUTE_NOT_FOUND and INVALID_JSON", async () => {
    const missing = await api().get("/api/transactions/000000000000000000000000").set(auth(user.token));
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe("TRANSACTION_NOT_FOUND");

    const route = await api().get("/api/nothing-here");
    expect(route.status).toBe(404);
    expect(route.body.code).toBe("ROUTE_NOT_FOUND");

    const json = await api().post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(json.status).toBe(400);
    expect(json.body.code).toBe("INVALID_JSON");
  });

  it("gives every bad row of an import its code", async () => {
    const res = await api()
      .post("/api/transactions/import")
      .set(auth(user.token))
      .send({
        rows: [
          { type: "expense", category: "Food", amount: -5 },
          { type: "expense", category: "Unknown", amount: 5 },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.errors).toEqual([
      { row: 1, message: "Amount must be greater than 0", code: "AMOUNT_INVALID" },
      {
        row: 2,
        message: 'Category "Unknown" (expense) not found',
        code: "IMPORT_CATEGORY_NOT_FOUND",
        params: { name: "Unknown", type: "expense" },
      },
    ]);
  });
});
