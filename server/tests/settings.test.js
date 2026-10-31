import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Notification from "../src/models/Notification.js";
import { currentMonth } from "../src/utils/month.js";
import { api, auth, findCategory, registerUser } from "./helpers.js";

// Phase 18: profile, password, log out of all devices, preferences, data export and account deletion.

// A new user who also owns one document in every collection, so deleting and exporting have something to work on
async function newUserWithData() {
  const user = await registerUser();
  const food = await findCategory(user.token, "Food");
  const bills = await findCategory(user.token, "Bills");
  const headers = auth(user.token);

  const transaction = await api().post("/api/transactions").set(headers).send({ categoryId: food._id, amount: 45000, note: "Lunch" });
  expect(transaction.status).toBe(201);
  const budget = await api().post("/api/budgets").set(headers).send({ categoryId: food._id, month: currentMonth(), amount: 50000 });
  expect(budget.status).toBe(201);
  const rule = await api()
    .post("/api/recurring")
    .set(headers)
    .send({ categoryId: bills._id, amount: 100000, note: "Rent", frequency: "monthly", startDate: "2026-10-01" });
  expect(rule.status).toBe(201);
  const goal = await api().post("/api/goals").set(headers).send({ name: "Trip", targetAmount: 1000000, color: "#4A9FE3" });
  expect(goal.status).toBe(201);
  const contribution = await api().post(`/api/goals/${goal.body.data._id}/contributions`).set(headers).send({ amount: 100000 });
  expect(contribution.status).toBe(201);
  const template = await api().post("/api/templates").set(headers).send({ name: "Coffee", categoryId: food._id, amount: 35000 });
  expect(template.status).toBe(201);
  // Whether a notification exists by now depends on the date, so one is stored directly
  await Notification.create({ userId: user.user._id, type: "weekly_summary", title: "T", message: "M", dedupeKey: "settings-test" });

  return { ...user, food, bills };
}

const login = (email, password) => api().post("/api/auth/login").send({ email, password });
const me = (token) => api().get("/api/auth/me").set(auth(token));
const changePassword = (token, body) => api().patch("/api/users/me/password").set(auth(token)).send(body);
const patchPreferences = (token, body) => api().patch("/api/users/me/preferences").set(auth(token)).send(body);

describe("settings: auth", () => {
  it("needs a token on every new route (401)", async () => {
    expect((await api().patch("/api/users/me").send({ name: "x" })).status).toBe(401);
    expect((await api().patch("/api/users/me/password").send({})).status).toBe(401);
    expect((await api().post("/api/auth/logout-all")).status).toBe(401);
    expect((await api().get("/api/users/me/export")).status).toBe(401);
    expect((await api().delete("/api/users/me").send({ password: "secret123" })).status).toBe(401);
  });
});

describe("token version", () => {
  it("puts tv in the token and starts every account at version 0", async () => {
    const user = await registerUser();
    expect(jwt.decode(user.token)).toMatchObject({ sub: user.user._id, tv: 0 });
    // The version is internal: it never reaches the client
    expect(user.user.tokenVersion).toBeUndefined();
    expect((await me(user.token)).body.data.tokenVersion).toBeUndefined();
  });

  it("still accepts a token made before tv existed (it counts as version 0)", async () => {
    const user = await registerUser();
    const old = jwt.sign({ sub: user.user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    expect((await me(old)).status).toBe(200);
  });

  it("refuses a token whose tv does not match the account (401)", async () => {
    const user = await registerUser();
    const wrong = jwt.sign({ sub: user.user._id, tv: 5 }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const res = await me(wrong);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });

  it("refuses a token of an account that no longer exists, and a token with a bad subject (401)", async () => {
    const gone = jwt.sign({ sub: new mongoose.Types.ObjectId().toString(), tv: 0 }, process.env.JWT_SECRET, { expiresIn: "1h" });
    expect((await me(gone)).status).toBe(401);
    const bad = jwt.sign({ sub: "not-an-id", tv: 0 }, process.env.JWT_SECRET, { expiresIn: "1h" });
    expect((await me(bad)).status).toBe(401);
  });
});

describe("PATCH /api/users/me", () => {
  it("changes the name (trimmed) and nothing else", async () => {
    const user = await registerUser();
    const res = await api().patch("/api/users/me").set(auth(user.token)).send({ name: "  New Name  ", email: "hacker@example.com", role: "admin" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("New Name");
    expect(res.body.data.email).toBe(user.email);
    expect(res.body.data.passwordHash).toBeUndefined();
    expect((await me(user.token)).body.data.name).toBe("New Name");
  });

  it("refuses an empty or too long name (400) and keeps the old one", async () => {
    const user = await registerUser({ name: "Keep Me" });
    for (const [body, code] of [
      [{}, "NAME_REQUIRED"],
      [{ name: "   " }, "NAME_REQUIRED"],
      [{ name: 42 }, "NAME_REQUIRED"],
      [{ name: "x".repeat(51) }, "NAME_TOO_LONG"],
    ]) {
      const res = await api().patch("/api/users/me").set(auth(user.token)).send(body);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(code);
    }
    expect((await me(user.token)).body.data.name).toBe("Keep Me");
  });
});

describe("PATCH /api/users/me/password", () => {
  it("changes the password: the old token stops working, the new token works, only the new password logs in", async () => {
    const user = await registerUser();
    const res = await changePassword(user.token, { currentPassword: user.password, newPassword: "brand-new-pass" });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(jwt.decode(res.body.data.token).tv).toBe(1);

    const old = await me(user.token);
    expect(old.status).toBe(401);
    expect(old.body.code).toBe("TOKEN_INVALID");
    expect((await me(res.body.data.token)).status).toBe(200);

    expect((await login(user.email, user.password)).status).toBe(401);
    expect((await login(user.email, "brand-new-pass")).status).toBe(200);
  });

  it("logs out the other devices too (a second login made before the change stops working)", async () => {
    const user = await registerUser();
    const otherDevice = (await login(user.email, user.password)).body.data.token;

    await changePassword(user.token, { currentPassword: user.password, newPassword: "brand-new-pass" });
    expect((await me(otherDevice)).status).toBe(401);
  });

  it("answers 400 (not 401) for a wrong current password and changes nothing", async () => {
    const user = await registerUser();
    const res = await changePassword(user.token, { currentPassword: "not-my-password", newPassword: "brand-new-pass" });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: "WRONG_PASSWORD" });
    // The token still works and the old password still logs in
    expect((await me(user.token)).status).toBe(200);
    expect((await login(user.email, user.password)).status).toBe(200);
  });

  it("refuses invalid input (400): missing current, new shorter than 8, too long, same as the current", async () => {
    const user = await registerUser();
    const cases = [
      [{ newPassword: "brand-new-pass" }, "CURRENT_PASSWORD_REQUIRED"],
      [{ currentPassword: user.password }, "NEW_PASSWORD_TOO_SHORT"],
      [{ currentPassword: user.password, newPassword: "short77" }, "NEW_PASSWORD_TOO_SHORT"],
      [{ currentPassword: user.password, newPassword: "x".repeat(73) }, "PASSWORD_TOO_LONG"],
      [{ currentPassword: user.password, newPassword: user.password }, "PASSWORD_UNCHANGED"],
    ];
    for (const [body, code] of cases) {
      const res = await changePassword(user.token, body);
      expect(res.status, code).toBe(400);
      expect(res.body.code).toBe(code);
    }
    // 8 characters is enough
    expect((await changePassword(user.token, { currentPassword: user.password, newPassword: "12345678" })).status).toBe(200);
  });
});

describe("POST /api/auth/logout-all", () => {
  it("makes every older token useless and gives this device a new one", async () => {
    const user = await registerUser();
    const otherDevice = (await login(user.email, user.password)).body.data.token;

    const res = await api().post("/api/auth/logout-all").set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));

    expect((await me(user.token)).status).toBe(401);
    expect((await me(otherDevice)).status).toBe(401);
    expect((await me(res.body.data.token)).status).toBe(200);
    // The password did not change
    expect((await login(user.email, user.password)).status).toBe(200);
  });

  it("works again with the new token (the version goes up each time)", async () => {
    const user = await registerUser();
    const first = (await api().post("/api/auth/logout-all").set(auth(user.token))).body.data.token;
    const second = await api().post("/api/auth/logout-all").set(auth(first));

    expect(second.status).toBe(200);
    expect(jwt.decode(second.body.data.token).tv).toBe(2);
    expect((await me(first)).status).toBe(401);
  });
});

describe("PATCH /api/users/me/preferences: theme, week start, language", () => {
  it("starts with theme system and week on Monday, and no language", async () => {
    const user = await registerUser();
    const preferences = (await me(user.token)).body.data.preferences;
    expect(preferences.theme).toBe("system");
    expect(preferences.weekStartsOn).toBe("monday");
    expect(preferences.language).toBeUndefined();
  });

  it("saves each one, and leaves the others (the notification switches too) as they were", async () => {
    const user = await registerUser();
    let res = await patchPreferences(user.token, { theme: "dark" });
    expect(res.status).toBe(200);
    expect(res.body.data.preferences).toMatchObject({ theme: "dark", weekStartsOn: "monday" });

    res = await patchPreferences(user.token, { weekStartsOn: "sunday", language: "vi" });
    expect(res.body.data.preferences).toMatchObject({ theme: "dark", weekStartsOn: "sunday", language: "vi" });

    res = await patchPreferences(user.token, { notifications: { budget: false }, theme: "light" });
    expect(res.body.data.preferences).toMatchObject({
      theme: "light",
      weekStartsOn: "sunday",
      language: "vi",
      notifications: { budget: false, goals: true, recurring: true, weekly: true },
    });
    // It is what /auth/me returns on another device
    expect((await me(user.token)).body.data.preferences.language).toBe("vi");
  });

  it("accepts every language of the app", async () => {
    const user = await registerUser();
    for (const language of ["en", "vi", "fr", "de", "es", "zh-CN", "ja", "ko"]) {
      expect((await patchPreferences(user.token, { language })).status).toBe(200);
    }
  });

  it("refuses invalid values (400) and changes nothing", async () => {
    const user = await registerUser();
    const bad = [
      [{ theme: "blue" }, "Theme must be one of light, dark, system"],
      [{ theme: 1 }, "Theme must be one of light, dark, system"],
      [{ weekStartsOn: "friday" }, "weekStartsOn must be one of monday, sunday"],
      [{ language: "xx" }, "Language must be one of en, vi, fr, de, es, zh-CN, ja, ko"],
      [{ language: "" }, "Language must be one of en, vi, fr, de, es, zh-CN, ja, ko"],
      [{ theme: "dark", language: "klingon" }, "Language must be one of en, vi, fr, de, es, zh-CN, ja, ko"],
      [{ colour: "red" }, "Only notifications, theme, weekStartsOn, language can be changed"],
      [{}, "Nothing to update"],
    ];
    for (const [body, message] of bad) {
      const res = await patchPreferences(user.token, body);
      expect(res.status, message).toBe(400);
      expect(res.body.message).toBe(message);
    }
    const preferences = (await me(user.token)).body.data.preferences;
    expect(preferences).toMatchObject({ theme: "system", weekStartsOn: "monday" });
    expect(preferences.language).toBeUndefined();
  });
});

describe("GET /api/users/me/export", () => {
  it("returns the profile and everything the user owns, without the password hash", async () => {
    const user = await newUserWithData();
    const res = await api().get("/api/users/me/export").set(auth(user.token));

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(Object.keys(data).sort()).toEqual(
      ["budgets", "categories", "exportedAt", "goals", "profile", "recurringRules", "templates", "transactions"].sort()
    );
    expect(data.profile).toMatchObject({ _id: user.user._id, name: "Test User", email: user.email });
    expect(data.categories.length).toBeGreaterThan(5);
    expect(data.transactions.some((t) => t.note === "Lunch" && t.category.name === "Food")).toBe(true);
    expect(data.budgets).toHaveLength(1);
    expect(data.budgets[0].category.name).toBe("Food");
    expect(data.recurringRules).toHaveLength(1);
    expect(data.goals).toHaveLength(1);
    expect(data.goals[0].contributions).toHaveLength(1);
    expect(data.templates).toHaveLength(1);

    // No secret anywhere in the file, and no userId (the file is the user's own)
    const text = JSON.stringify(res.body);
    expect(text).not.toContain("passwordHash");
    expect(text).not.toContain("tokenVersion");
    expect(text).not.toContain("userId");
    expect(text).not.toContain(user.password);
  });

  it("contains only the data of the signed-in user", async () => {
    const mine = await newUserWithData();
    const other = await newUserWithData();
    const data = (await api().get("/api/users/me/export").set(auth(mine.token))).body.data;

    expect(data.profile._id).toBe(mine.user._id);
    expect(JSON.stringify(data)).not.toContain(other.user._id);
    expect(JSON.stringify(data)).not.toContain(other.email);
  });

  it("works for an account with nothing in it but the default categories", async () => {
    const user = await registerUser();
    const data = (await api().get("/api/users/me/export").set(auth(user.token))).body.data;
    expect(data.transactions).toEqual([]);
    expect(data.goals).toEqual([]);
  });
});

describe("DELETE /api/users/me", () => {
  it("refuses a missing or wrong password (400) and deletes nothing", async () => {
    const user = await newUserWithData();

    const missing = await api().delete("/api/users/me").set(auth(user.token));
    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe("PASSWORD_REQUIRED");

    const wrong = await api().delete("/api/users/me").set(auth(user.token)).send({ password: "wrong-password" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.code).toBe("WRONG_PASSWORD");

    // Still signed in, and the data is still there
    expect((await me(user.token)).status).toBe(200);
    const data = (await api().get("/api/users/me/export").set(auth(user.token))).body.data;
    expect(data.transactions.length).toBeGreaterThan(0);
  });

  it("deletes the user and leaves no document of the user in any collection", async () => {
    const user = await newUserWithData();
    const keeper = await newUserWithData();

    const res = await api().delete("/api/users/me").set(auth(user.token)).send({ password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ deleted: true });

    // Every model that has a userId, found by looking at the schemas, so a model added later is checked too
    const owned = Object.values(mongoose.models).filter((model) => model.schema.path("userId"));
    expect(owned.map((model) => model.modelName).sort()).toEqual(
      ["Budget", "Category", "Goal", "Notification", "RecurringRule", "Transaction", "TransactionTemplate"].sort()
    );
    for (const model of owned) {
      expect(await model.countDocuments({ userId: user.user._id }), model.modelName).toBe(0);
    }
    expect(await User.countDocuments({ _id: user.user._id })).toBe(0);

    // The token and the password are useless now
    expect((await me(user.token)).status).toBe(401);
    expect((await login(user.email, user.password)).status).toBe(401);

    // Another user's data is untouched
    for (const model of owned) {
      expect(await model.countDocuments({ userId: keeper.user._id }), model.modelName).toBeGreaterThan(0);
    }
    expect((await me(keeper.token)).status).toBe(200);
  });

  it("lets the same email register again after the account is gone", async () => {
    const user = await registerUser();
    await api().delete("/api/users/me").set(auth(user.token)).send({ password: user.password });
    const again = await api().post("/api/auth/register").send({ name: "Back", email: user.email, password: "secret123" });
    expect(again.status).toBe(201);
  });
});

describe("settings: Swagger docs", () => {
  it("documents every new route", async () => {
    // A YAML mistake in a route comment only logs a warning, so the spec would silently miss the route
    const { default: spec } = await import("../src/config/swagger.js");
    const operations = Object.entries(spec.paths).flatMap(([path, item]) => Object.keys(item).map((method) => `${method} ${path}`));

    expect(operations).toEqual(
      expect.arrayContaining([
        "patch /users/me",
        "delete /users/me",
        "patch /users/me/password",
        "patch /users/me/preferences",
        "get /users/me/export",
        "post /auth/logout-all",
      ])
    );
    expect(spec.components.schemas.User.properties.preferences.properties).toHaveProperty("theme");
  });
});
