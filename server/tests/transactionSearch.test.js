import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, findCategory, registerUser } from "./helpers.js";

let user;

beforeAll(async () => {
  user = await registerUser();
  const food = await findCategory(user.token, "Food");
  const salary = await findCategory(user.token, "Salary");
  const add = (categoryId, amount, note, date) =>
    api().post("/api/transactions").set(auth(user.token)).send({ categoryId, amount, note, date });

  await add(food._id, 35000, "Coffee (large)", "2026-10-02T08:00:00+07:00");
  await add(food._id, 120000, "Lunch with team", "2026-10-15T12:00:00+07:00");
  await add(food._id, 45000, "coffee beans", "2026-10-20T18:00:00+07:00");
  await add(salary._id, 20000000, "=SUM(A1)", "2026-10-25T09:00:00+07:00");
});

function list(query) {
  return api().get(`/api/transactions?${query}`).set(auth(user.token));
}

describe("GET /api/transactions search, sort and date range", () => {
  it("searches the note as plain text, ignoring case", async () => {
    const res = await list("month=2026-10&q=coffee");
    expect(res.body.data.map((t) => t.note).sort()).toEqual(["Coffee (large)", "coffee beans"]);

    // "(" is not regex syntax here
    const paren = await list("month=2026-10&q=(large");
    expect(paren.body.data).toHaveLength(1);
  });

  it("sorts by amount", async () => {
    const res = await list("month=2026-10&sort=amount");
    expect(res.body.data.map((t) => t.amount)).toEqual([35000, 45000, 120000, 20000000]);
  });

  it("filters by type", async () => {
    const res = await list("month=2026-10&type=income");
    expect(res.body.data).toHaveLength(1);
  });

  it("filters by a date range that includes the whole last day", async () => {
    const res = await list("from=2026-10-15&to=2026-10-20");
    expect(res.body.data.map((t) => t.note).sort()).toEqual(["Lunch with team", "coffee beans"]);
  });

  it.each([
    ["month=2026-10&from=2026-10-01", "Use either month or from/to, not both"],
    ["from=2026-10-20&to=2026-10-01", "From must be before or equal to to"],
    ["from=2026-02-30", "From must be a date in YYYY-MM-DD format"],
    ["sort=price", "Sort must be one of date, -date, amount, -amount"],
    ["page=0", "Page must be a whole number from 1"],
    ["limit=101", "Limit must be a whole number from 1 to 100"],
  ])("refuses %s (400)", async (query, message) => {
    const res = await list(query);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
  });
});

describe("GET /api/transactions/export", () => {
  it("returns a CSV file, with formulas made safe", async () => {
    const res = await api().get("/api/transactions/export?month=2026-10&sort=date").set(auth(user.token));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toBe('attachment; filename="ledgerling-2026-10.csv"');

    const lines = res.text.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[0]).toBe("Date,Type,Category,Amount,Currency,Note,Tags");
    expect(lines[1]).toBe("2026-10-02 08:00,expense,Food,35000,VND,Coffee (large),");
    expect(lines).toHaveLength(5);
    expect(lines[4]).toBe("2026-10-25 09:00,income,Salary,20000000,VND,'=SUM(A1),");
  });

  it("needs a token (401)", async () => {
    expect((await api().get("/api/transactions/export")).status).toBe(401);
  });
});
