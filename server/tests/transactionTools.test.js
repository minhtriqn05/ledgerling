import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, findCategory, registerUser } from "./helpers.js";

let user;
let other;
let food;

const post = (token, body) => api().post("/api/transactions").set(auth(token)).send(body);
const list = (query, token = user.token) => api().get(`/api/transactions?${query}`).set(auth(token));

beforeAll(async () => {
  user = await registerUser();
  other = await registerUser();
  food = await findCategory(user.token, "Food");
});

describe("tags on POST and PATCH /api/transactions", () => {
  it("saves tags lower-cased, trimmed and without duplicates", async () => {
    const res = await post(user.token, {
      categoryId: food._id,
      amount: 1000,
      tags: ["Work", " work ", "Team-Lunch"],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.tags).toEqual(["work", "team-lunch"]);
  });

  it("has no tags when none are sent", async () => {
    const res = await post(user.token, { categoryId: food._id, amount: 1000 });
    expect(res.body.data.tags).toEqual([]);
  });

  it.each([
    ["a string", "work", "Tags must be an array"],
    ["a number inside", [1], "Each tag must be 1-20 letters, digits or hyphens"],
    ["a space", ["two words"], "Each tag must be 1-20 letters, digits or hyphens"],
    ["a symbol", ["work!"], "Each tag must be 1-20 letters, digits or hyphens"],
    ["an empty tag", [""], "Each tag must be 1-20 letters, digits or hyphens"],
    ["21 characters", ["a".repeat(21)], "Each tag must be 1-20 letters, digits or hyphens"],
    ["6 tags", ["a", "b", "c", "d", "e", "f"], "A transaction can have at most 5 tags"],
  ])("refuses tags that are %s (400)", async (_name, tags, message) => {
    const res = await post(user.token, { categoryId: food._id, amount: 1000, tags });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
  });

  it("accepts a tag of exactly 20 characters and exactly 5 tags", async () => {
    const res = await post(user.token, {
      categoryId: food._id,
      amount: 1000,
      tags: ["a".repeat(20), "b", "c", "d", "e"],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.tags).toHaveLength(5);
  });

  it("replaces the tags on PATCH, and [] removes them", async () => {
    const created = await post(user.token, { categoryId: food._id, amount: 1000, tags: ["old"] });
    const id = created.body.data._id;

    const changed = await api().patch(`/api/transactions/${id}`).set(auth(user.token)).send({ tags: ["new", "NEW"] });
    expect(changed.status).toBe(200);
    expect(changed.body.data.tags).toEqual(["new"]);

    const cleared = await api().patch(`/api/transactions/${id}`).set(auth(user.token)).send({ tags: [] });
    expect(cleared.body.data.tags).toEqual([]);

    const bad = await api().patch(`/api/transactions/${id}`).set(auth(user.token)).send({ tags: ["no good"] });
    expect(bad.status).toBe(400);
  });

  it("does not let another user change my tags (404)", async () => {
    const created = await post(user.token, { categoryId: food._id, amount: 1000, tags: ["mine"] });
    const res = await api()
      .patch(`/api/transactions/${created.body.data._id}`)
      .set(auth(other.token))
      .send({ tags: ["stolen"] });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/tags and the tag filter", () => {
  let tagged;

  beforeAll(async () => {
    tagged = await registerUser();
    const cat = await findCategory(tagged.token, "Food");
    const add = (note, tags) =>
      post(tagged.token, { categoryId: cat._id, amount: 5000, note, tags, date: "2026-09-10T10:00:00+07:00" });
    await add("one", ["work", "trip"]);
    await add("two", ["work"]);
    await add("three", ["work", "lunch"]);
    await add("four", ["lunch"]);
    await add("five", []);
    // Another user's tags must never show up
    await post(other.token, {
      categoryId: (await findCategory(other.token, "Food"))._id,
      amount: 1,
      tags: ["secret"],
    });
  });

  it("lists my tags with their count, most used first and then A to Z", async () => {
    const res = await api().get("/api/tags").set(auth(tagged.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { tag: "work", count: 3 },
      { tag: "lunch", count: 2 },
      { tag: "trip", count: 1 },
    ]);
  });

  it("answers an empty list for a user without tags", async () => {
    const fresh = await registerUser();
    const res = await api().get("/api/tags").set(auth(fresh.token));
    expect(res.body).toEqual({ success: true, data: [] });
  });

  it("needs a token (401)", async () => {
    expect((await api().get("/api/tags")).status).toBe(401);
  });

  it("filters the list by tag", async () => {
    const res = await list("month=2026-09&tag=work", tagged.token);
    expect(res.status).toBe(200);
    expect(res.body.data.map((t) => t.note).sort()).toEqual(["one", "three", "two"]);
    expect(res.body.meta.total).toBe(3);
  });

  it("ignores the case of the tag, and combines with the search", async () => {
    const res = await list("month=2026-09&tag=WORK&q=th", tagged.token);
    expect(res.body.data.map((t) => t.note)).toEqual(["three"]);
  });

  it("finds nothing for a tag that nobody used, and never another user's tag", async () => {
    expect((await list("month=2026-09&tag=nothing", tagged.token)).body.data).toEqual([]);
    expect((await list("month=2026-09&tag=secret", tagged.token)).body.data).toEqual([]);
  });

  it.each([["tag=bad tag"], ["tag=work!"], ["tag="], ["tag=a&tag=b"], [`tag=${"a".repeat(21)}`]])(
    "refuses ?%s (400)",
    async (query) => {
      const res = await list(query, tagged.token);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Each tag must be 1-20 letters, digits or hyphens");
    }
  );
});

describe("GET /api/transactions/export with tags", () => {
  it("has a Tags column, separated by semicolons, and honours the tag filter", async () => {
    const exporter = await registerUser();
    const cat = await findCategory(exporter.token, "Food");
    const add = (note, tags) =>
      post(exporter.token, { categoryId: cat._id, amount: 7000, note, tags, date: "2026-08-05T09:00:00+07:00" });
    await add("a", ["work", "trip"]);
    await add("b", []);

    const all = await api().get("/api/transactions/export?month=2026-08&sort=date").set(auth(exporter.token));
    const lines = all.text.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[0]).toBe("Date,Type,Category,Amount,Currency,Note,Tags");
    expect(lines[1]).toBe("2026-08-05 09:00,expense,Food,7000,VND,a,work;trip");
    expect(lines[2]).toBe("2026-08-05 09:00,expense,Food,7000,VND,b,");

    const filtered = await api().get("/api/transactions/export?month=2026-08&tag=trip").set(auth(exporter.token));
    expect(filtered.text.replace(/^﻿/, "").trim().split("\r\n")).toHaveLength(2);

    const bad = await api().get("/api/transactions/export?tag=no%20good").set(auth(exporter.token));
    expect(bad.status).toBe(400);
  });

  it("starts with a UTF-8 BOM, quotes commas, quotes and line breaks, and guards every formula start", async () => {
    const exporter = await registerUser();
    const cat = await findCategory(exporter.token, "Food");
    const notes = ['say "hi", ok', "two\nlines", "+1 call", "-5 off", "@me", "=1+1", "plain"];
    for (const note of notes) {
      await post(exporter.token, { categoryId: cat._id, amount: 1, note, date: "2026-07-05T09:00:00+07:00" });
    }
    const res = await api().get("/api/transactions/export?month=2026-07").set(auth(exporter.token));

    expect(res.text.startsWith("﻿")).toBe(true);
    expect(res.headers["content-disposition"]).toBe('attachment; filename="ledgerling-2026-07.csv"');
    expect(res.text).toContain('"say ""hi"", ok"');
    expect(res.text).toContain('"two\nlines"');
    for (const guarded of ["'+1 call", "'-5 off", "'@me", "'=1+1"]) expect(res.text).toContain(`,${guarded},`);
    expect(res.text).toContain(",plain,");
  });
});

describe("POST /api/transactions/import", () => {
  const importRows = (token, rows) => api().post("/api/transactions/import").set(auth(token)).send({ rows });

  it("saves the valid rows and reads the export date format as Vietnam time", async () => {
    const importer = await registerUser();
    const res = await importRows(importer.token, [
      { date: "2026-10-02 08:00", type: "expense", category: "Food", amount: 35000, currency: "vnd", note: "Coffee", tags: ["Work"] },
      { date: "2026-10-03", type: "income", category: "salary", amount: 20000000 },
      { date: "2026-10-04T12:00:00+07:00", type: "expense", category: "Transport", amount: 12000, note: "", tags: "", currency: "" },
    ]);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ imported: 3, failed: 0, errors: [] });

    const saved = (await list("month=2026-10&sort=date", importer.token)).body.data;
    expect(saved).toHaveLength(3);
    expect(saved[0]).toMatchObject({
      date: "2026-10-02T01:00:00.000Z", // 08:00 in Vietnam = 01:00 UTC
      type: "expense",
      amount: 35000,
      currency: "VND",
      note: "Coffee",
      tags: ["work"],
    });
    expect(saved[0].category.name).toBe("Food");
    // Category names are matched ignoring case; a day alone means 00:00 Vietnam time
    expect(saved[1]).toMatchObject({ date: "2026-10-02T17:00:00.000Z", type: "income" });
    expect(saved[1].category.name).toBe("Salary");
    // Empty cells fall back to the defaults
    expect(saved[2]).toMatchObject({ currency: "VND", note: "", tags: [] });
  });

  it("saves only the valid rows and lists the others by row number", async () => {
    const importer = await registerUser();
    const res = await importRows(importer.token, [
      { date: "2026-10-02 08:00", type: "expense", category: "Food", amount: 1000 },
      { date: "2026-10-02 08:00", type: "expense", category: "Food", amount: -5 },
      { date: "not a date", type: "expense", category: "Food", amount: 1000 },
      { date: "2026-02-30", type: "expense", category: "Food", amount: 1000 },
      { date: "2026-10-02 25:00", type: "expense", category: "Food", amount: 1000 },
      { date: "2026-10-02", type: "other", category: "Food", amount: 1000 },
      { date: "2026-10-02", type: "expense", category: "", amount: 1000 },
      { date: "2026-10-02", type: "expense", category: "Food", amount: "1000" },
      { date: "2026-10-02", type: "expense", category: "Food", amount: 1000, currency: "DONG" },
      { date: "2026-10-02", type: "expense", category: "Food", amount: 1000, note: "x".repeat(201) },
      { date: "2026-10-02", type: "expense", category: "Food", amount: 1000, tags: ["bad tag"] },
      { date: "2026-10-02", type: "expense", category: "Food", amount: 1000, tags: ["1", "2", "3", "4", "5", "6"] },
      "not an object",
      { date: "2026-10-05", type: "income", category: "Salary", amount: 2000 },
    ]);

    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(2);
    expect(res.body.data.failed).toBe(12);
    expect(res.body.data.errors).toEqual([
      { row: 2, message: "Amount must be greater than 0", code: "AMOUNT_INVALID" },
      { row: 3, message: "Date is invalid, use ISO 8601 like 2026-10-27T12:30:00+07:00", code: "DATE_INVALID" },
      { row: 4, message: "Date is invalid, use YYYY-MM-DD HH:mm or ISO 8601", code: "DATE_INVALID" },
      { row: 5, message: "Date is invalid, use YYYY-MM-DD HH:mm or ISO 8601", code: "DATE_INVALID" },
      { row: 6, message: "Type must be income or expense", code: "TYPE_INVALID" },
      { row: 7, message: "Category is required", code: "CATEGORY_REQUIRED" },
      { row: 8, message: "Amount must be greater than 0", code: "AMOUNT_INVALID" },
      { row: 9, message: "Currency must be a 3-letter ISO code", code: "CURRENCY_INVALID" },
      { row: 10, message: "Note must be at most 200 characters", code: "NOTE_TOO_LONG" },
      { row: 11, message: "Each tag must be 1-20 letters, digits or hyphens", code: "TAG_INVALID" },
      { row: 12, message: "A transaction can have at most 5 tags", code: "TOO_MANY_TAGS" },
      { row: 13, message: "Row must be an object", code: "VALIDATION_ERROR" },
    ]);

    const saved = await list("month=2026-10", importer.token);
    expect(saved.body.meta.total).toBe(2);
  });

  it("refuses a category that does not exist or has the other type, and never creates one", async () => {
    const importer = await registerUser();
    const res = await importRows(importer.token, [
      { date: "2026-10-02", type: "expense", category: "Groceries", amount: 1000 },
      { date: "2026-10-02", type: "income", category: "Food", amount: 1000 },
    ]);

    expect(res.body.data.imported).toBe(0);
    expect(res.body.data.errors).toEqual([
      {
        row: 1,
        message: 'Category "Groceries" (expense) not found',
        code: "IMPORT_CATEGORY_NOT_FOUND",
        params: { name: "Groceries", type: "expense" },
      },
      {
        row: 2,
        message: 'Category "Food" (income) not found',
        code: "IMPORT_CATEGORY_NOT_FOUND",
        params: { name: "Food", type: "income" },
      },
    ]);
    const categories = await api().get("/api/categories").set(auth(importer.token));
    expect(categories.body.data.map((c) => c.name)).not.toContain("Groceries");
    expect(categories.body.data).toHaveLength(7);
  });

  it("cannot use another user's category, even one that is not in my account", async () => {
    const owner = await registerUser();
    const importer = await registerUser();
    const custom = await api()
      .post("/api/categories")
      .set(auth(owner.token))
      .send({ name: "Pets", type: "expense", color: "#112233" });
    expect(custom.status).toBe(201);

    const res = await importRows(importer.token, [{ date: "2026-10-02", type: "expense", category: "Pets", amount: 1000 }]);
    expect(res.body.data).toMatchObject({ imported: 0, failed: 1 });
    expect((await list("month=2026-10", owner.token)).body.data).toEqual([]);
  });

  it("always saves to the signed-in user, whatever userId the row says", async () => {
    const importer = await registerUser();
    const victim = await registerUser();
    const res = await importRows(importer.token, [
      { date: "2026-10-02", type: "expense", category: "Food", amount: 1000, userId: victim.user._id },
    ]);
    expect(res.body.data.imported).toBe(1);
    expect((await list("month=2026-10", importer.token)).body.data).toHaveLength(1);
    expect((await list("month=2026-10", victim.token)).body.data).toHaveLength(0);
  });

  it("takes exactly 500 rows and refuses 501 (400)", async () => {
    const importer = await registerUser();
    const row = { date: "2026-10-02", type: "expense", category: "Food", amount: 1000, note: "n".repeat(200) };

    const ok = await importRows(importer.token, Array(500).fill(row));
    expect(ok.status).toBe(200);
    expect(ok.body.data.imported).toBe(500);

    const tooMany = await importRows(importer.token, Array(501).fill(row));
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.message).toBe("You can import at most 500 rows at a time");
  });

  it.each([
    ["no body", undefined],
    ["no rows", {}],
    ["rows that is not an array", { rows: "abc" }],
    ["an empty array", { rows: [] }],
  ])("refuses %s (400)", async (_name, body) => {
    const importer = await registerUser();
    const res = await api().post("/api/transactions/import").set(auth(importer.token)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Rows must be a non-empty array");
  });

  it("needs a token (401)", async () => {
    const res = await api().post("/api/transactions/import").send({ rows: [] });
    expect(res.status).toBe(401);
  });

  it("takes back the file it exported: same rows, same tags, same dates", async () => {
    const exporter = await registerUser();
    const food = await findCategory(exporter.token, "Food");
    const salary = await findCategory(exporter.token, "Salary");
    const add = (body) => post(exporter.token, { date: "2026-06-10T08:30:00+07:00", ...body });
    await add({ categoryId: food._id, amount: 45000, note: "Lunch", tags: ["work", "trip"] });
    await add({ categoryId: salary._id, amount: 9000000, note: "Pay", date: "2026-06-11T09:00:00+07:00" });

    const file = await api().get("/api/transactions/export?month=2026-06&sort=date").set(auth(exporter.token));
    // A minimal CSV reader is enough here: the notes have no commas or quotes
    const [header, ...lines] = file.text.replace(/^﻿/, "").trim().split("\r\n");
    const columns = header.split(",");
    const rows = lines.map((line) => {
      const cells = line.split(",");
      const row = Object.fromEntries(columns.map((name, i) => [name.toLowerCase(), cells[i]]));
      return { ...row, amount: Number(row.amount), tags: row.tags ? row.tags.split(";") : [] };
    });

    const res = await importRows(exporter.token, rows);
    expect(res.body.data).toEqual({ imported: 2, failed: 0, errors: [] });

    const all = (await list("month=2026-06&sort=date", exporter.token)).body.data;
    expect(all).toHaveLength(4);
    const [a, b] = all.filter((t) => t.note === "Lunch");
    expect(b.date).toBe(a.date);
    expect(b.tags).toEqual(["work", "trip"]);
    expect(b.amount).toBe(45000);
  });
});
