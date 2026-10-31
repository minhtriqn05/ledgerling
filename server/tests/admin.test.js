import { beforeAll, describe, expect, it } from "vitest";
import User from "../src/models/User.js";
import Transaction from "../src/models/Transaction.js";
import { api, auth, findCategory, registerUser } from "./helpers.js";

// Phase 19: roles, the Admin API and disabled accounts.

// No API route can create an admin (that is the point), so the tests change the role in the database,
// like `npm run make-admin` does. The token stays valid: the role is read from the database on every request.
async function registerAdmin(overrides) {
  const admin = await registerUser(overrides);
  await User.updateOne({ _id: admin.user._id }, { role: "admin" });
  return admin;
}

async function addTransaction(user, amount = 10000) {
  const food = await findCategory(user.token, "Food");
  const res = await api().post("/api/transactions").set(auth(user.token)).send({ categoryId: food._id, amount });
  expect(res.status).toBe(201);
}

const login = (email, password) => api().post("/api/auth/login").send({ email, password });
const me = (token) => api().get("/api/auth/me").set(auth(token));
const setStatus = (token, id, status) => api().patch(`/api/admin/users/${id}/status`).set(auth(token)).send({ status });
const listUsers = (token, query = "") => api().get(`/api/admin/users${query}`).set(auth(token));

let admin;
let normal;

beforeAll(async () => {
  admin = await registerAdmin({ name: "Boss Admin" });
  normal = await registerUser({ name: "Normal Person" });
});

describe("roles", () => {
  it("starts every account as an active user, and shows the role to the client", async () => {
    expect(normal.user).toMatchObject({ role: "user", status: "active" });
    expect((await me(normal.token)).body.data).toMatchObject({ role: "user", status: "active" });
    expect((await me(admin.token)).body.data.role).toBe("admin");
  });

  it("cannot be set through the API", async () => {
    const registered = await registerUser({ role: "admin", status: "disabled" });
    expect(registered.user).toMatchObject({ role: "user", status: "active" });

    const name = await api().patch("/api/users/me").set(auth(normal.token)).send({ name: "Still Normal", role: "admin" });
    expect(name.status).toBe(200);
    expect(name.body.data.role).toBe("user");

    const preferences = await api().patch("/api/users/me/preferences").set(auth(normal.token)).send({ role: "admin" });
    expect(preferences.status).toBe(400);

    expect((await User.findById(normal.user._id)).role).toBe("user");
  });

  it("applies a change of role at once, with the same token", async () => {
    const user = await registerUser();
    expect((await api().get("/api/admin/stats").set(auth(user.token))).status).toBe(403);
    await User.updateOne({ _id: user.user._id }, { role: "admin" });
    expect((await api().get("/api/admin/stats").set(auth(user.token))).status).toBe(200);
    await User.updateOne({ _id: user.user._id }, { role: "user" });
    expect((await api().get("/api/admin/stats").set(auth(user.token))).status).toBe(403);
  });
});

describe("admin routes: access", () => {
  const routes = [
    ["get", "/api/admin/stats"],
    ["get", "/api/admin/users"],
    ["patch", "/api/admin/users/000000000000000000000000/status"],
  ];

  it.each(routes)("%s %s answers 401 without a token", async (method, path) => {
    const res = await api()[method](path).send({ status: "disabled" });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "TOKEN_MISSING" });
  });

  it.each(routes)("%s %s answers 401 with a bad token", async (method, path) => {
    const res = await api()[method](path).set(auth("not-a-token")).send({ status: "disabled" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });

  it.each(routes)("%s %s answers 403 to a normal user", async (method, path) => {
    const res = await api()[method](path).set(auth(normal.token)).send({ status: "disabled" });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, message: "You do not have permission to do this", code: "FORBIDDEN" });
  });

  it("does not let a normal user disable anyone", async () => {
    const victim = await registerUser();
    expect((await setStatus(normal.token, victim.user._id, "disabled")).status).toBe(403);
    expect((await login(victim.email, victim.password)).status).toBe(200);
  });
});

describe("GET /api/admin/stats", () => {
  it("counts users, transactions and the last 30 days", async () => {
    // A fresh database per file: admin + normal + the users of the tests above are in it already
    const before = (await api().get("/api/admin/stats").set(auth(admin.token))).body.data;

    const active = await registerUser();
    const idle = await registerUser();
    await addTransaction(active);
    await addTransaction(active);
    // A transaction from 10 days ago does not make its user "active in the last 7 days"
    const food = await findCategory(idle.token, "Food");
    await Transaction.create({
      userId: idle.user._id,
      categoryId: food._id,
      type: "expense",
      amount: 5000,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });

    const res = await api().get("/api/admin/stats").set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const stats = res.body.data;

    expect(stats.totalUsers).toBe(before.totalUsers + 2);
    expect(stats.totalTransactions).toBe(before.totalTransactions + 3);
    expect(stats.activeUsers7d).toBe(before.activeUsers7d + 1);

    for (const series of [stats.newUsersPerDay, stats.transactionsPerDay]) {
      expect(series).toHaveLength(30);
      expect(series[0].date < series[29].date).toBe(true);
      expect(series.every((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && Number.isInteger(day.count))).toBe(true);
    }
    // The 10-day-old transaction is on its own day, the new users and the 2 new transactions are on today
    const sum = (series) => series.reduce((total, day) => total + day.count, 0);
    expect(sum(stats.newUsersPerDay)).toBe(stats.totalUsers);
    expect(sum(stats.transactionsPerDay)).toBe(stats.totalTransactions);
    expect(stats.transactionsPerDay[19].count).toBe(1);
    expect(stats.newUsersPerDay[29].count).toBeGreaterThanOrEqual(2);
  });

  it("holds numbers only, nothing about a user", async () => {
    const res = await api().get("/api/admin/stats").set(auth(admin.token));
    expect(Object.keys(res.body.data).sort()).toEqual(
      ["activeUsers7d", "newUsersPerDay", "totalTransactions", "totalUsers", "transactionsPerDay"]
    );
    expect(JSON.stringify(res.body)).not.toContain(normal.email);
  });
});

describe("GET /api/admin/users", () => {
  it("lists the accounts with their number of transactions, newest first", async () => {
    const user = await registerUser({ name: "Counted Person" });
    await addTransaction(user);
    await addTransaction(user);

    const res = await listUsers(admin.token);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 10 });
    expect(res.body.meta.total).toBeGreaterThanOrEqual(4);

    const times = res.body.data.map((u) => new Date(u.createdAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));

    const row = res.body.data.find((u) => u._id === user.user._id);
    expect(row).toEqual({
      _id: user.user._id,
      name: "Counted Person",
      email: user.email,
      role: "user",
      status: "active",
      createdAt: expect.any(String),
      transactionCount: 2,
    });
  });

  it("never returns a password hash, a token version or a transaction", async () => {
    const res = await listUsers(admin.token, "?limit=50");
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/passwordHash|tokenVersion|preferences|\$2[aby]\$/);
    for (const row of res.body.data) {
      expect(Object.keys(row).sort()).toEqual(["_id", "createdAt", "email", "name", "role", "status", "transactionCount"]);
    }
  });

  it("searches the name and the email, ignoring case", async () => {
    const needle = await registerUser({ name: "Zebulon Quux", email: "Zebulon.Quux@Example.com" });

    const byName = await listUsers(admin.token, "?q=zEBULON qu");
    expect(byName.body.data.map((u) => u._id)).toEqual([needle.user._id]);
    expect(byName.body.meta.total).toBe(1);

    const byEmail = await listUsers(admin.token, "?q=quux@EXAMPLE");
    expect(byEmail.body.data.map((u) => u._id)).toEqual([needle.user._id]);

    const none = await listUsers(admin.token, "?q=nobody-has-this-name");
    expect(none.status).toBe(200);
    expect(none.body.data).toEqual([]);
    expect(none.body.meta).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
  });

  it("reads the search as text, not as a pattern", async () => {
    expect((await listUsers(admin.token, "?q=.*")).body.data).toEqual([]);
    expect((await listUsers(admin.token, "?q=(")).status).toBe(200);
  });

  it("pages the result", async () => {
    const first = await listUsers(admin.token, "?limit=2&page=1");
    const second = await listUsers(admin.token, "?limit=2&page=2");
    expect(first.body.data).toHaveLength(2);
    expect(first.body.meta.totalPages).toBe(Math.ceil(first.body.meta.total / 2));
    expect(second.body.meta.page).toBe(2);
    expect(second.body.data.map((u) => u._id)).not.toEqual(first.body.data.map((u) => u._id));

    const beyond = await listUsers(admin.token, "?limit=2&page=999");
    expect(beyond.status).toBe(200);
    expect(beyond.body.data).toEqual([]);
  });

  it("answers 400 to a bad page, limit or search", async () => {
    for (const query of ["?page=0", "?page=abc", "?page=-1", "?limit=0", "?limit=51", "?limit=x", `?q=${"a".repeat(101)}`]) {
      const res = await listUsers(admin.token, query);
      expect(res.status, query).toBe(400);
      expect(res.body.success).toBe(false);
    }
  });
});

describe("PATCH /api/admin/users/:id/status", () => {
  it("disables an account: no login (403), old tokens stop working (401), data stays", async () => {
    const user = await registerUser({ name: "To Disable" });
    await addTransaction(user);
    expect((await me(user.token)).status).toBe(200);

    const res = await setStatus(admin.token, user.user._id, "disabled");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ _id: user.user._id, email: user.email, status: "disabled", transactionCount: 1 });
    expect(res.body.data.passwordHash).toBeUndefined();

    // Logging in with the right password
    const refused = await login(user.email, user.password);
    expect(refused.status).toBe(403);
    expect(refused.body).toEqual({ success: false, message: "Account disabled", code: "ACCOUNT_DISABLED" });
    expect(refused.body.data).toBeUndefined();

    // The token it had before
    const stale = await me(user.token);
    expect(stale.status).toBe(401);
    expect(stale.body.code).toBe("TOKEN_INVALID");
    expect((await api().get("/api/transactions").set(auth(user.token))).status).toBe(401);

    // The list shows it
    const row = (await listUsers(admin.token, `?q=${encodeURIComponent(user.email)}`)).body.data[0];
    expect(row).toMatchObject({ status: "disabled", transactionCount: 1 });
  });

  it("does not tell a stranger that an email is disabled: a wrong password is still 401", async () => {
    const user = await registerUser();
    await setStatus(admin.token, user.user._id, "disabled");
    const res = await login(user.email, "not-the-password");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("enables the account again: it can log in, with a working new token", async () => {
    const user = await registerUser();
    await setStatus(admin.token, user.user._id, "disabled");

    const res = await setStatus(admin.token, user.user._id, "active");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("active");

    const again = await login(user.email, user.password);
    expect(again.status).toBe(200);
    expect((await me(again.body.data.token)).status).toBe(200);
    // The token from before the lock stays dead
    expect((await me(user.token)).status).toBe(401);
  });

  it("raises the token version only when the status really changes", async () => {
    const user = await registerUser();
    const version = async () => (await User.findById(user.user._id)).tokenVersion;
    expect(await version()).toBe(0);

    await setStatus(admin.token, user.user._id, "disabled");
    expect(await version()).toBe(1);
    await setStatus(admin.token, user.user._id, "disabled");
    expect(await version()).toBe(1);
    await setStatus(admin.token, user.user._id, "active");
    expect(await version()).toBe(1);
  });

  it("refuses to disable yourself (403) and another admin (403)", async () => {
    const self = await setStatus(admin.token, admin.user._id, "disabled");
    expect(self.status).toBe(403);
    expect(self.body.code).toBe("CANNOT_DISABLE_SELF");

    const other = await registerAdmin();
    const res = await setStatus(admin.token, other.user._id, "disabled");
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CANNOT_DISABLE_ADMIN");

    // Nothing changed, and both can still use their tokens
    expect((await me(admin.token)).status).toBe(200);
    expect((await me(other.token)).status).toBe(200);
    expect((await login(other.email, other.password)).status).toBe(200);
  });

  it("changes only the status, whatever else the body holds", async () => {
    const user = await registerUser();
    const res = await api()
      .patch(`/api/admin/users/${user.user._id}/status`)
      .set(auth(admin.token))
      .send({ status: "disabled", role: "admin", name: "Hacked", email: "x@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ role: "user", name: user.user.name, email: user.email });
  });

  it("answers 400 to a missing or unknown status", async () => {
    const user = await registerUser();
    for (const body of [{}, { status: "banned" }, { status: 1 }, { status: null }]) {
      const res = await api().patch(`/api/admin/users/${user.user._id}/status`).set(auth(admin.token)).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.code).toBe("STATUS_INVALID");
    }
    expect((await login(user.email, user.password)).status).toBe(200);
  });

  it("answers 404 to an unknown or malformed id", async () => {
    for (const id of ["000000000000000000000000", "not-an-id"]) {
      const res = await setStatus(admin.token, id, "disabled");
      expect(res.status, id).toBe(404);
      expect(res.body).toEqual({ success: false, message: "User not found", code: "USER_NOT_FOUND" });
    }
  });
});
