import { beforeAll, describe, expect, it } from "vitest";
import Notification from "../src/models/Notification.js";
import { addDays, currentMonth, isoWeekKey, todayInVietnam } from "../src/utils/month.js";
import { api, auth, findCategory, registerUser } from "./helpers.js";

const MONTH = currentMonth();

// A new user with their Food (expense), Salary (income) and Bills (expense) categories
async function newUser() {
  const user = await registerUser();
  const food = await findCategory(user.token, "Food");
  const salary = await findCategory(user.token, "Salary");
  const bills = await findCategory(user.token, "Bills");
  return { ...user, food, salary, bills };
}

function postBudget(user, category, amount = 1000000) {
  return api().post("/api/budgets").set(auth(user.token)).send({ categoryId: category._id, month: MONTH, amount });
}

function postTransaction(user, category, amount, extra = {}) {
  return api().post("/api/transactions").set(auth(user.token)).send({ categoryId: category._id, amount, ...extra });
}

// Straight from the database, so the weekly summary (created when the list is read) is not in the way
async function stored(user, type) {
  return Notification.find({ userId: user.user._id, ...(type ? { type } : {}) }).sort({ createdAt: 1 });
}

function setPreferences(user, notifications) {
  return api().patch("/api/users/me/preferences").set(auth(user.token)).send({ notifications });
}

function listNotifications(user, query = "") {
  return api().get(`/api/notifications${query}`).set(auth(user.token));
}

async function unreadCount(user) {
  const res = await api().get("/api/notifications/unread-count").set(auth(user.token));
  return res.body.data.count;
}

describe("notifications: auth", () => {
  it("needs a token on every route (401)", async () => {
    const id = "6720f1b2c3d4e5f601234701";
    expect((await api().get("/api/notifications")).status).toBe(401);
    expect((await api().get("/api/notifications/unread-count")).status).toBe(401);
    expect((await api().patch("/api/notifications/read-all")).status).toBe(401);
    expect((await api().patch(`/api/notifications/${id}/read`)).status).toBe(401);
    expect((await api().delete(`/api/notifications/${id}`)).status).toBe(401);
    expect((await api().patch("/api/users/me/preferences").send({})).status).toBe(401);
  });
});

describe("notifications: budget thresholds", () => {
  let user;
  beforeAll(async () => {
    user = await newUser();
    await postBudget(user, user.food);
  });

  it("creates one warning when the budget passes 80%, however many transactions follow", async () => {
    await postTransaction(user, user.food, 700000);
    expect(await stored(user)).toHaveLength(0);

    await postTransaction(user, user.food, 100000); // exactly 80%
    await postTransaction(user, user.food, 20000);
    await postTransaction(user, user.food, 30000);

    const notifications = await stored(user);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: "budget_warning",
      read: false,
      link: `/budgets?month=${MONTH}`,
      params: { categoryName: "Food", month: MONTH, percent: 80, spent: 800000, amount: 1000000 },
    });
    expect(notifications[0].title).toBe("Budget warning: Food");
  });

  it("creates one over-budget notification at 100%, and the warning stays", async () => {
    await postTransaction(user, user.food, 150000); // exactly 100%
    await postTransaction(user, user.food, 50000);
    await postTransaction(user, user.food, 50000);

    expect((await stored(user)).map((n) => n.type)).toEqual(["budget_warning", "budget_over"]);
    expect(await unreadCount(user)).toBe(2);
  });

  it("creates only the over-budget notification when one transaction jumps from below 80% past 100%", async () => {
    const jumper = await newUser();
    await postBudget(jumper, jumper.food);
    await postTransaction(jumper, jumper.food, 1500000);

    expect((await stored(jumper)).map((n) => n.type)).toEqual(["budget_over"]);
  });

  it("notifies when editing a transaction pushes the budget over a threshold", async () => {
    const editor = await newUser();
    await postBudget(editor, editor.food);
    const created = await postTransaction(editor, editor.food, 100000);
    expect(await stored(editor)).toHaveLength(0);

    const res = await api()
      .patch(`/api/transactions/${created.body.data._id}`)
      .set(auth(editor.token))
      .send({ categoryId: editor.food._id, amount: 900000 });
    expect(res.status).toBe(200);
    expect((await stored(editor)).map((n) => n.type)).toEqual(["budget_warning"]);

    // Saving the same transaction again does not notify a second time
    await api()
      .patch(`/api/transactions/${created.body.data._id}`)
      .set(auth(editor.token))
      .send({ categoryId: editor.food._id, amount: 910000 });
    expect(await stored(editor)).toHaveLength(1);
  });

  it("ignores income, a category without a budget, another month and another currency", async () => {
    const quiet = await newUser();
    await postBudget(quiet, quiet.food);
    await postTransaction(quiet, quiet.salary, 5000000);
    await postTransaction(quiet, quiet.bills, 5000000);
    await postTransaction(quiet, quiet.food, 5000000, { currency: "USD" });
    await postTransaction(quiet, quiet.food, 5000000, { date: "2020-01-15T12:00:00+07:00" });

    expect(await stored(quiet)).toHaveLength(0);
  });

  it("does not notify the owner of the budget about another user's spending", async () => {
    const owner = await newUser();
    const stranger = await newUser();
    await postBudget(owner, owner.food);
    await postBudget(stranger, stranger.food);
    await postTransaction(stranger, stranger.food, 900000);

    expect(await stored(owner)).toHaveLength(0);
    expect(await stored(stranger)).toHaveLength(1);
  });
});

describe("notifications: switches", () => {
  it("creates no budget notification when the budget switch is off, and keeps the other switches", async () => {
    const user = await newUser();
    const res = await setPreferences(user, { budget: false });
    expect(res.status).toBe(200);
    expect(res.body.data.preferences.notifications).toEqual({ budget: false, goals: true, recurring: true, weekly: true });

    await postBudget(user, user.food);
    await postTransaction(user, user.food, 1200000);
    expect(await stored(user)).toHaveLength(0);
  });

  it("creates it again after the switch is turned back on", async () => {
    const user = await newUser();
    await setPreferences(user, { budget: false });
    await postBudget(user, user.food);
    await postTransaction(user, user.food, 850000);
    await setPreferences(user, { budget: true });
    await postTransaction(user, user.food, 10000);

    expect((await stored(user)).map((n) => n.type)).toEqual(["budget_warning"]);
  });

  it("creates no goal notification when the goals switch is off", async () => {
    const user = await newUser();
    await setPreferences(user, { goals: false });
    const goal = (await api().post("/api/goals").set(auth(user.token)).send({ name: "Trip", targetAmount: 100000, color: "#4A9FE3" })).body.data;
    await api().post(`/api/goals/${goal._id}/contributions`).set(auth(user.token)).send({ amount: 100000 });

    expect(await stored(user)).toHaveLength(0);
  });

  it("creates no recurring notification when the recurring switch is off", async () => {
    const user = await newUser();
    await setPreferences(user, { recurring: false });
    await api()
      .post("/api/recurring")
      .set(auth(user.token))
      .send({ categoryId: user.bills._id, amount: 100000, frequency: "weekly", startDate: addDays(todayInVietnam(), -8) });
    await api().get("/api/transactions").set(auth(user.token));

    expect(await stored(user)).toHaveLength(0);
  });

  it("creates no weekly summary when the weekly switch is off", async () => {
    const user = await newUser();
    await setPreferences(user, { weekly: false });
    await postTransaction(user, user.food, 50000);

    const res = await listNotifications(user);
    expect(res.body.data).toEqual([]);
  });

  it("is on for every switch of a new account, and /auth/me shows it", async () => {
    const user = await registerUser();
    const me = await api().get("/api/auth/me").set(auth(user.token));
    expect(me.body.data.preferences.notifications).toEqual({ budget: true, goals: true, recurring: true, weekly: true });
  });

  it("treats an account without the field (made before this phase) as all on", async () => {
    const user = await newUser();
    const User = (await import("../src/models/User.js")).default;
    await User.collection.updateOne({ email: user.email }, { $unset: { preferences: "" } });

    await postBudget(user, user.food);
    await postTransaction(user, user.food, 900000);
    expect(await stored(user)).toHaveLength(1);
  });

  it("refuses invalid preferences (400) and changes nothing", async () => {
    const user = await newUser();
    const bad = [
      [{}, "Nothing to update"],
      [{ notifications: {} }, "Nothing to update"],
      [{ notifications: "off" }, "Notifications must be an object"],
      [{ notifications: [true] }, "Notifications must be an object"],
      [{ notifications: { budget: "no" } }, 'Notification setting "budget" must be true or false'],
      [{ notifications: { sound: true } }, "Notifications can only have budget, goals, recurring, weekly"],
      [{ notifications: { budget: false }, theme: "dark" }, "Only notifications can be changed"],
    ];
    for (const [body, message] of bad) {
      const res = await api().patch("/api/users/me/preferences").set(auth(user.token)).send(body);
      expect(res.status, message).toBe(400);
      expect(res.body.message).toBe(message);
    }
    const me = await api().get("/api/auth/me").set(auth(user.token));
    expect(me.body.data.preferences.notifications).toEqual({ budget: true, goals: true, recurring: true, weekly: true });
  });
});

describe("notifications: goals and recurring rules", () => {
  it("creates one notification when a goal reaches its target, and none for deposits afterwards", async () => {
    const user = await newUser();
    const goal = (await api().post("/api/goals").set(auth(user.token)).send({ name: "Trip", targetAmount: 100000, color: "#4A9FE3" })).body.data;
    const deposit = (amount) => api().post(`/api/goals/${goal._id}/contributions`).set(auth(user.token)).send({ amount });

    await deposit(60000);
    expect(await stored(user)).toHaveLength(0);
    await deposit(40000);
    await deposit(10000);
    await deposit(10000);

    const notifications = await stored(user);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: "goal_completed",
      link: "/goals",
      params: { goalName: "Trip", targetAmount: 100000 },
    });
  });

  it("creates one summary notification for all the transactions a recurring pass created", async () => {
    const user = await newUser();
    // A weekly rule that started 15 days ago is due 3 times: 15, 8 and 1 day ago
    await api()
      .post("/api/recurring")
      .set(auth(user.token))
      .send({ categoryId: user.bills._id, amount: 100000, frequency: "weekly", startDate: addDays(todayInVietnam(), -15) });

    const first = await api().get("/api/transactions").set(auth(user.token));
    expect(first.body.data).toHaveLength(3);
    await api().get("/api/transactions").set(auth(user.token)); // nothing is due any more

    const notifications = await stored(user);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ type: "recurring_created", params: { count: 3 }, link: "/transactions" });
  });
});

describe("notifications: weekly summary", () => {
  it("is not created for an account without transactions", async () => {
    const user = await newUser();
    const res = await listNotifications(user);
    expect(res.body.data).toEqual([]);
  });

  it("is created once a week, when the notifications are listed", async () => {
    const user = await newUser();
    await postTransaction(user, user.food, 40000);
    await postTransaction(user, user.food, 60000);
    await postTransaction(user, user.salary, 5000000);

    // The count is polled all the time and must not create anything
    expect(await unreadCount(user)).toBe(0);

    const first = await listNotifications(user);
    await listNotifications(user);
    await listNotifications(user);

    expect(first.body.data).toHaveLength(1);
    expect(first.body.data[0]).toMatchObject({
      type: "weekly_summary",
      link: "/reports",
      params: { total: 100000, count: 2, topCategory: "Food", to: todayInVietnam() },
    });
    expect(await stored(user, "weekly_summary")).toHaveLength(1);
  });

  it("is created again once the last one is older than 7 days", async () => {
    const user = await newUser();
    await postTransaction(user, user.food, 40000);
    await listNotifications(user);

    const [weekly] = await stored(user, "weekly_summary");
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await Notification.collection.updateOne(
      { _id: weekly._id },
      { $set: { createdAt: eightDaysAgo, dedupeKey: `weekly:${isoWeekKey(addDays(todayInVietnam(), -8))}` } }
    );

    await listNotifications(user);
    expect(await stored(user, "weekly_summary")).toHaveLength(2);
    await listNotifications(user);
    expect(await stored(user, "weekly_summary")).toHaveLength(2);
  });

  it("says so when nothing was spent", async () => {
    const user = await newUser();
    await postTransaction(user, user.salary, 5000000);
    const res = await listNotifications(user);
    expect(res.body.data[0].params).toMatchObject({ total: 0, count: 0, topCategory: null });
    expect(res.body.data[0].message).toBe("You did not spend anything in the last 7 days.");
  });
});

describe("isoWeekKey", () => {
  it.each([
    ["2026-10-31", "2026-W44"],
    ["2026-10-26", "2026-W44"], // Monday
    ["2026-10-25", "2026-W43"], // Sunday
    ["2026-01-01", "2026-W01"],
    ["2027-01-01", "2026-W53"], // belongs to the year of its Thursday
    ["2024-12-30", "2025-W01"],
  ])("%s is in %s", (day, week) => {
    expect(isoWeekKey(day)).toBe(week);
  });
});

describe("notifications: list, read, delete", () => {
  let user;
  let other;
  let ids;

  beforeAll(async () => {
    user = await newUser();
    other = await newUser();
    await setPreferences(user, { weekly: false });
    await setPreferences(other, { weekly: false });

    // 5 notifications for the user, with known times so the order is certain
    const docs = [1, 2, 3, 4, 5].map((n) => ({
      userId: user.user._id,
      type: "goal_completed",
      title: `Goal ${n}`,
      message: `Goal ${n} reached`,
      link: "/goals",
      dedupeKey: `test:${n}`,
      createdAt: new Date(Date.now() - (6 - n) * 60000),
    }));
    ids = (await Notification.insertMany(docs)).map((n) => String(n._id));
  });

  it("lists newest first with meta, and the user is not in the answer", async () => {
    const res = await listNotifications(user);
    expect(res.status).toBe(200);
    expect(res.body.data.map((n) => n.title)).toEqual(["Goal 5", "Goal 4", "Goal 3", "Goal 2", "Goal 1"]);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 5, totalPages: 1 });
    expect(res.body.data[0].userId).toBeUndefined();
    expect(res.body.data[0].dedupeKey).toBeUndefined();
  });

  it("pages the list", async () => {
    const res = await listNotifications(user, "?page=2&limit=2");
    expect(res.body.data.map((n) => n.title)).toEqual(["Goal 3", "Goal 2"]);
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });

    const past = await listNotifications(user, "?page=9&limit=2");
    expect(past.body.data).toEqual([]);
  });

  it("refuses a bad page, limit or unread (400)", async () => {
    expect((await listNotifications(user, "?page=0")).status).toBe(400);
    expect((await listNotifications(user, "?page=x")).status).toBe(400);
    expect((await listNotifications(user, "?limit=0")).status).toBe(400);
    expect((await listNotifications(user, "?limit=51")).status).toBe(400);
    expect((await listNotifications(user, "?unread=maybe")).status).toBe(400);
  });

  it("marks one notification as read and filters the unread ones", async () => {
    expect(await unreadCount(user)).toBe(5);

    const res = await api().patch(`/api/notifications/${ids[4]}/read`).set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ _id: ids[4], read: true });

    // Reading it again is fine
    expect((await api().patch(`/api/notifications/${ids[4]}/read`).set(auth(user.token))).status).toBe(200);

    expect(await unreadCount(user)).toBe(4);
    const unread = await listNotifications(user, "?unread=true");
    expect(unread.body.data.map((n) => n.title)).toEqual(["Goal 4", "Goal 3", "Goal 2", "Goal 1"]);
    expect(unread.body.meta.total).toBe(4);
    expect((await listNotifications(user, "?unread=false")).body.meta.total).toBe(5);
  });

  it("answers 404 for another user's notification and leaves it untouched", async () => {
    const read = await api().patch(`/api/notifications/${ids[0]}/read`).set(auth(other.token));
    expect(read.status).toBe(404);
    expect(read.body).toEqual({ success: false, message: "Notification not found", code: "NOTIFICATION_NOT_FOUND" });

    const del = await api().delete(`/api/notifications/${ids[0]}`).set(auth(other.token));
    expect(del.status).toBe(404);
    expect(await Notification.exists({ _id: ids[0], read: false })).toBeTruthy();
  });

  it("answers 404 for an id that does not exist or is malformed", async () => {
    expect((await api().patch("/api/notifications/000000000000000000000000/read").set(auth(user.token))).status).toBe(404);
    expect((await api().patch("/api/notifications/abc/read").set(auth(user.token))).status).toBe(404);
    expect((await api().delete("/api/notifications/abc").set(auth(user.token))).status).toBe(404);
  });

  it("does not read the notifications of another user in read-all", async () => {
    await Notification.create({
      userId: other.user._id,
      type: "goal_completed",
      title: "Other",
      message: "Other",
      dedupeKey: "test:other",
    });

    const res = await api().patch("/api/notifications/read-all").set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ updated: 4 });
    expect(await unreadCount(user)).toBe(0);
    expect(await unreadCount(other)).toBe(1);

    // Nothing left to change
    const again = await api().patch("/api/notifications/read-all").set(auth(user.token));
    expect(again.body.data).toEqual({ updated: 0 });
  });

  it("deletes a notification, then answers 404", async () => {
    const res = await api().delete(`/api/notifications/${ids[0]}`).set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ _id: ids[0] });

    expect((await api().delete(`/api/notifications/${ids[0]}`).set(auth(user.token))).status).toBe(404);
    expect((await listNotifications(user)).body.meta.total).toBe(4);
  });
});

describe("notifications: unique event", () => {
  it("the database refuses the same dedupeKey twice for one user, but not for two users", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const doc = { type: "goal_completed", title: "T", message: "M", dedupeKey: "same" };

    await Notification.create({ ...doc, userId: a.user._id });
    await expect(Notification.create({ ...doc, userId: a.user._id })).rejects.toMatchObject({ code: 11000 });
    await expect(Notification.create({ ...doc, userId: b.user._id })).resolves.toBeTruthy();
  });
});

describe("notifications: Swagger docs", () => {
  it("documents every notification route and the preferences route", async () => {
    // A YAML mistake in a route comment only logs a warning, so the spec would silently miss the route
    const { default: spec } = await import("../src/config/swagger.js");
    const operations = Object.entries(spec.paths).flatMap(([path, item]) => Object.keys(item).map((method) => `${method} ${path}`));

    expect(operations).toEqual(
      expect.arrayContaining([
        "get /notifications",
        "get /notifications/unread-count",
        "patch /notifications/read-all",
        "patch /notifications/{id}/read",
        "delete /notifications/{id}",
        "patch /users/me/preferences",
      ])
    );
    expect(spec.components.schemas.Notification).toBeDefined();
  });
});
