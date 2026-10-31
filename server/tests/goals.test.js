import { beforeAll, describe, expect, it } from "vitest";
import Goal from "../src/models/Goal.js";
import { vietnamDay } from "../src/utils/month.js";
import { api, auth, registerUser } from "./helpers.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// A day in Vietnam time: 0 = today, 1 = tomorrow, -1 = yesterday
function dayFromToday(offset) {
  return vietnamDay(new Date(Date.now() + offset * DAY_MS));
}

function postGoal(token, body) {
  return api().post("/api/goals").set(auth(token)).send(body);
}

// Creates a goal (target 1.000.000, no deadline) and returns it. overrides change only what the test is about.
async function createGoal(user, overrides = {}) {
  const res = await postGoal(user.token, {
    name: "New laptop",
    targetAmount: 1000000,
    color: "#4A9FE3",
    ...overrides,
  });
  expect(res.status).toBe(201);
  return res.body.data;
}

function postContribution(user, goalId, body) {
  return api().post(`/api/goals/${goalId}/contributions`).set(auth(user.token)).send(body);
}

function getGoal(user, goalId) {
  return api().get(`/api/goals/${goalId}`).set(auth(user.token));
}

// The saved amount stored in the database, to be sure a refused request changed nothing
async function savedInDatabase(goalId) {
  return (await Goal.findById(goalId)).savedAmount;
}

describe("goals: auth", () => {
  it("needs a token on every route (401)", async () => {
    const id = "6720f1b2c3d4e5f601234601";
    const contributionId = "6720f1b2c3d4e5f601234611";
    expect((await api().get("/api/goals")).status).toBe(401);
    expect((await api().post("/api/goals").send({})).status).toBe(401);
    expect((await api().get(`/api/goals/${id}`)).status).toBe(401);
    expect((await api().put(`/api/goals/${id}`).send({})).status).toBe(401);
    expect((await api().delete(`/api/goals/${id}`)).status).toBe(401);
    expect((await api().post(`/api/goals/${id}/contributions`).send({ amount: 1 })).status).toBe(401);
    expect((await api().delete(`/api/goals/${id}/contributions/${contributionId}`)).status).toBe(401);
  });

  it("refuses a token that is not valid (401)", async () => {
    const res = await api().get("/api/goals").set(auth("not-a-token"));
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: "Not authorized, invalid token", code: expect.any(String) });
  });
});

describe("goals: create", () => {
  let user;
  beforeAll(async () => {
    user = await registerUser();
  });

  it("creates a goal that starts empty", async () => {
    const res = await postGoal(user.token, {
      name: "  New laptop ",
      targetAmount: 20000000,
      deadline: dayFromToday(30),
      color: "#4A9FE3",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      name: "New laptop",
      targetAmount: 20000000,
      savedAmount: 0,
      color: "#4A9FE3",
      progress: 0,
      remaining: 20000000,
      completed: false,
      contributions: [],
    });
    // The deadline is stored at noon Vietnam time, so it is the same day in Vietnam
    expect(vietnamDay(new Date(res.body.data.deadline))).toBe(dayFromToday(30));
    // Internal fields never reach the client
    expect(res.body.data.userId).toBeUndefined();
    expect(res.body.data.__v).toBeUndefined();
  });

  it("works without a deadline", async () => {
    const goal = await createGoal(user);
    expect(goal.deadline).toBeNull();
  });

  it("takes the owner from the token and ignores savedAmount, userId and contributions in the body", async () => {
    const other = await registerUser();
    const goal = await createGoal(user, {
      userId: "6720a1b2c3d4e5f601234567",
      savedAmount: 999999,
      contributions: [{ amount: 999999, date: "2026-01-01" }],
    });

    expect(goal.savedAmount).toBe(0);
    expect(goal.contributions).toEqual([]);
    expect((await Goal.findById(goal._id)).userId.toString()).toBe(user.user._id);
    // and it is not in the other user's list
    const list = await api().get("/api/goals").set(auth(other.token));
    expect(list.body.data).toEqual([]);
  });

  it.each([
    ["no name", { name: "" }, "Name is required"],
    ["a name of spaces", { name: "   " }, "Name is required"],
    ["a name that is not a string", { name: 5 }, "Name is required"],
    ["a name of 61 characters", { name: "x".repeat(61) }, "Name must be at most 60 characters"],
    ["a target of 0", { targetAmount: 0 }, "Target amount must be a whole number greater than 0"],
    ["a negative target", { targetAmount: -5 }, "Target amount must be a whole number greater than 0"],
    ["a target with decimals", { targetAmount: 1000.5 }, "Target amount must be a whole number greater than 0"],
    ["a target that is a string", { targetAmount: "1000" }, "Target amount must be a whole number greater than 0"],
    ["a target that is too big", { targetAmount: 1e15 }, "Target amount must be a whole number greater than 0"],
    ["no color", { color: undefined }, "Color must be a hex code like #FF7043"],
    ["a color that is not hex", { color: "blue" }, "Color must be a hex code like #FF7043"],
    ["a short hex color", { color: "#FFF" }, "Color must be a hex code like #FF7043"],
    ["a deadline that is not a day", { deadline: "soon" }, "Deadline must be a date in YYYY-MM-DD format"],
    ["a deadline that does not exist", { deadline: "2027-02-30" }, "Deadline must be a date in YYYY-MM-DD format"],
    ["a deadline that is a number", { deadline: 20271231 }, "Deadline must be a date in YYYY-MM-DD format"],
    ["a deadline today", { deadline: dayFromToday(0) }, "Deadline must be after today"],
    ["a deadline in the past", { deadline: dayFromToday(-1) }, "Deadline must be after today"],
  ])("refuses %s (400)", async (_label, change, message) => {
    const res = await postGoal(user.token, {
      name: "New laptop",
      targetAmount: 1000000,
      color: "#4A9FE3",
      ...change,
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message, code: expect.any(String) });
  });

  it("accepts tomorrow as the deadline", async () => {
    const goal = await createGoal(user, { deadline: dayFromToday(1) });
    expect(vietnamDay(new Date(goal.deadline))).toBe(dayFromToday(1));
  });

  it("treats an empty or null deadline as no deadline", async () => {
    expect((await createGoal(user, { deadline: "" })).deadline).toBeNull();
    expect((await createGoal(user, { deadline: null })).deadline).toBeNull();
  });

  it("refuses a body that is not a JSON object with a 400 and not a crash", async () => {
    const res = await api().post("/api/goals").set(auth(user.token)).send();
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("goals: list and get", () => {
  let user;
  beforeAll(async () => {
    user = await registerUser();
  });

  it("returns [] when there are no goals", async () => {
    const res = await api().get("/api/goals").set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [] });
  });

  it("puts goals still to reach first by nearest deadline, then goals without one, then completed goals", async () => {
    const far = await createGoal(user, { name: "Far", deadline: dayFromToday(90) });
    const noDeadline = await createGoal(user, { name: "No deadline" });
    const near = await createGoal(user, { name: "Near", deadline: dayFromToday(10) });
    const done = await createGoal(user, { name: "Done", targetAmount: 1000, deadline: dayFromToday(2) });
    await postContribution(user, done._id, { amount: 1000 });

    const res = await api().get("/api/goals").set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body.data.map((g) => g.name)).toEqual(["Near", "Far", "No deadline", "Done"]);
    expect([far._id, noDeadline._id, near._id, done._id].sort()).toEqual(res.body.data.map((g) => g._id).sort());
  });

  it("returns progress, remaining and completed, and leaves the history out of the list", async () => {
    const goal = await createGoal(user, { name: "Trip", targetAmount: 4000000 });
    await postContribution(user, goal._id, { amount: 1000000, note: "First" });

    const res = await api().get("/api/goals").set(auth(user.token));
    const trip = res.body.data.find((g) => g._id === goal._id);
    expect(trip).toMatchObject({ savedAmount: 1000000, progress: 25, remaining: 3000000, completed: false });
    expect(trip.contributions).toBeUndefined();
  });

  it("returns one goal with its history, newest first", async () => {
    const goal = await createGoal(user, { name: "History" });
    await postContribution(user, goal._id, { amount: 300000, note: "old", date: dayFromToday(-5) });
    await postContribution(user, goal._id, { amount: 200000, note: "today first" });
    await postContribution(user, goal._id, { amount: -100000, note: "today second" });

    const res = await getGoal(user, goal._id);
    expect(res.status).toBe(200);
    expect(res.body.data.savedAmount).toBe(400000);
    expect(res.body.data.contributions.map((c) => c.note)).toEqual(["today second", "today first", "old"]);
    expect(res.body.data.contributions[0]).toMatchObject({ amount: -100000 });
    expect(res.body.data.contributions[0]._id).toEqual(expect.any(String));
  });

  it("shows only 99.9 while the goal is a little short, so 100 always means reached", async () => {
    const goal = await createGoal(user, { targetAmount: 100000 });
    const res = await postContribution(user, goal._id, { amount: 99996 });
    expect(res.body.data.progress).toBe(99.9);
    expect(res.body.data.completed).toBe(false);
  });

  it("answers 404 for another user's goal and for an id that does not exist", async () => {
    const other = await registerUser();
    const goal = await createGoal(user);

    const foreign = await getGoal(other, goal._id);
    expect(foreign.status).toBe(404);
    expect(foreign.body).toEqual({ success: false, message: "Goal not found", code: expect.any(String) });

    expect((await getGoal(user, "6720f1b2c3d4e5f601234699")).status).toBe(404);
    expect((await getGoal(user, "not-an-id")).status).toBe(404);
  });
});

describe("goals: update", () => {
  let user;
  beforeAll(async () => {
    user = await registerUser();
  });

  function putGoal(token, id, body) {
    return api().put(`/api/goals/${id}`).set(auth(token)).send(body);
  }

  it("replaces name, target, deadline and color, and keeps the saved amount and the history", async () => {
    const goal = await createGoal(user, { deadline: dayFromToday(30) });
    await postContribution(user, goal._id, { amount: 250000 });

    const res = await putGoal(user.token, goal._id, {
      name: "Gaming laptop",
      targetAmount: 1000000,
      deadline: dayFromToday(60),
      color: "#F07D62",
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      name: "Gaming laptop",
      color: "#F07D62",
      savedAmount: 250000,
      progress: 25,
    });
    expect(vietnamDay(new Date(res.body.data.deadline))).toBe(dayFromToday(60));
    expect(res.body.data.contributions).toHaveLength(1);
  });

  it("ignores savedAmount in the body", async () => {
    const goal = await createGoal(user);
    const res = await putGoal(user.token, goal._id, {
      name: "Same",
      targetAmount: 1000000,
      color: "#4A9FE3",
      savedAmount: 1000000,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.savedAmount).toBe(0);
    expect(await savedInDatabase(goal._id)).toBe(0);
  });

  it("removes the deadline when it is left out", async () => {
    const goal = await createGoal(user, { deadline: dayFromToday(30) });
    const res = await putGoal(user.token, goal._id, { name: "No more deadline", targetAmount: 1000000, color: "#4A9FE3" });
    expect(res.status).toBe(200);
    expect(res.body.data.deadline).toBeNull();
  });

  it("allows a deadline in the past, so a late goal can still be renamed", async () => {
    const goal = await createGoal(user, { deadline: dayFromToday(5) });
    const res = await putGoal(user.token, goal._id, {
      name: "Late but not given up",
      targetAmount: 1000000,
      deadline: dayFromToday(-3),
      color: "#4A9FE3",
    });
    expect(res.status).toBe(200);
    expect(vietnamDay(new Date(res.body.data.deadline))).toBe(dayFromToday(-3));
  });

  it("completes the goal when the target is lowered to what was saved", async () => {
    const goal = await createGoal(user);
    await postContribution(user, goal._id, { amount: 400000 });
    const res = await putGoal(user.token, goal._id, { name: "Smaller", targetAmount: 400000, color: "#4A9FE3" });
    expect(res.body.data).toMatchObject({ completed: true, progress: 100, remaining: 0 });
  });

  it("refuses invalid input (400) and changes nothing", async () => {
    const goal = await createGoal(user);
    const base = { name: "Valid", targetAmount: 1000000, color: "#4A9FE3" };

    const noName = await putGoal(user.token, goal._id, { ...base, name: "" });
    expect(noName.status).toBe(400);
    expect(noName.body.message).toBe("Name is required");

    const badTarget = await putGoal(user.token, goal._id, { ...base, targetAmount: 0 });
    expect(badTarget.status).toBe(400);
    expect(badTarget.body.message).toBe("Target amount must be a whole number greater than 0");

    const badColor = await putGoal(user.token, goal._id, { ...base, color: "red" });
    expect(badColor.status).toBe(400);

    const badDeadline = await putGoal(user.token, goal._id, { ...base, deadline: "tomorrow" });
    expect(badDeadline.status).toBe(400);

    expect((await Goal.findById(goal._id)).name).toBe("New laptop");
  });

  it("answers 404 for another user's goal and leaves it untouched", async () => {
    const other = await registerUser();
    const goal = await createGoal(user);

    const res = await putGoal(other.token, goal._id, { name: "Hacked", targetAmount: 1, color: "#000000" });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: "Goal not found", code: expect.any(String) });
    expect((await Goal.findById(goal._id)).name).toBe("New laptop");

    expect((await putGoal(user.token, "not-an-id", { name: "x", targetAmount: 1, color: "#000000" })).status).toBe(404);
  });
});

describe("goals: delete", () => {
  let user;
  beforeAll(async () => {
    user = await registerUser();
  });

  it("deletes a goal with its history, then answers 404", async () => {
    const goal = await createGoal(user);
    await postContribution(user, goal._id, { amount: 1000 });

    const res = await api().delete(`/api/goals/${goal._id}`).set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { _id: goal._id } });
    expect(await Goal.findById(goal._id)).toBeNull();

    expect((await api().delete(`/api/goals/${goal._id}`).set(auth(user.token))).status).toBe(404);
  });

  it("answers 404 for another user's goal and does not delete it", async () => {
    const other = await registerUser();
    const goal = await createGoal(user);

    const res = await api().delete(`/api/goals/${goal._id}`).set(auth(other.token));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: "Goal not found", code: expect.any(String) });
    expect(await Goal.findById(goal._id)).not.toBeNull();

    expect((await api().delete("/api/goals/not-an-id").set(auth(user.token))).status).toBe(404);
  });
});

describe("goals: contributions", () => {
  let user;
  beforeAll(async () => {
    user = await registerUser();
  });

  it("adds money and updates the progress", async () => {
    const goal = await createGoal(user, { targetAmount: 1000000 });

    const res = await postContribution(user, goal._id, { amount: 250000, note: " Salary ", date: "2026-10-15" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ savedAmount: 250000, progress: 25, remaining: 750000, completed: false });
    expect(res.body.data.contributions).toHaveLength(1);
    expect(res.body.data.contributions[0]).toMatchObject({ amount: 250000, note: "Salary" });
    // A day is stored at noon Vietnam time
    expect(res.body.data.contributions[0].date).toBe("2026-10-15T05:00:00.000Z");
  });

  it("uses today when no date is sent", async () => {
    const goal = await createGoal(user);
    const res = await postContribution(user, goal._id, { amount: 1000 });
    expect(vietnamDay(new Date(res.body.data.contributions[0].date))).toBe(dayFromToday(0));
    expect(res.body.data.contributions[0].note).toBe("");
  });

  it("withdraws money, including all of it", async () => {
    const goal = await createGoal(user);
    await postContribution(user, goal._id, { amount: 500000 });

    const part = await postContribution(user, goal._id, { amount: -200000, note: "Phone repair" });
    expect(part.status).toBe(201);
    expect(part.body.data).toMatchObject({ savedAmount: 300000, progress: 30 });

    const rest = await postContribution(user, goal._id, { amount: -300000 });
    expect(rest.status).toBe(201);
    expect(rest.body.data.savedAmount).toBe(0);
    expect(await savedInDatabase(goal._id)).toBe(0);
  });

  it("refuses to withdraw more than was saved (400) and changes nothing", async () => {
    const goal = await createGoal(user);
    await postContribution(user, goal._id, { amount: 100000 });

    const res = await postContribution(user, goal._id, { amount: -100001 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: "You cannot withdraw more than the saved amount", code: expect.any(String) });

    const after = await getGoal(user, goal._id);
    expect(after.body.data.savedAmount).toBe(100000);
    expect(after.body.data.contributions).toHaveLength(1);
  });

  it("refuses to withdraw from a goal with nothing saved (400)", async () => {
    const goal = await createGoal(user);
    const res = await postContribution(user, goal._id, { amount: -1 });
    expect(res.status).toBe(400);
    expect(await savedInDatabase(goal._id)).toBe(0);
  });

  it("shows Completed once the target is reached, and also when more than the target is saved", async () => {
    const goal = await createGoal(user, { targetAmount: 1000000 });

    const exact = await postContribution(user, goal._id, { amount: 1000000 });
    expect(exact.body.data).toMatchObject({ completed: true, progress: 100, remaining: 0 });

    const over = await postContribution(user, goal._id, { amount: 500000 });
    expect(over.body.data).toMatchObject({ savedAmount: 1500000, completed: true, progress: 100, remaining: 0 });

    // Withdrawing below the target makes it unfinished again
    const back = await postContribution(user, goal._id, { amount: -600000 });
    expect(back.body.data).toMatchObject({ savedAmount: 900000, completed: false, progress: 90, remaining: 100000 });
  });

  it.each([
    ["no amount", {}, "Amount must be a whole number other than 0"],
    ["an amount of 0", { amount: 0 }, "Amount must be a whole number other than 0"],
    ["an amount with decimals", { amount: 10.5 }, "Amount must be a whole number other than 0"],
    ["an amount that is a string", { amount: "1000" }, "Amount must be a whole number other than 0"],
    ["an amount that is null", { amount: null }, "Amount must be a whole number other than 0"],
    ["an amount that is too big", { amount: 1e13 }, "Amount must be a whole number other than 0"],
    ["a note that is not a string", { amount: 1000, note: 5 }, "Note must be a string"],
    ["a note of 201 characters", { amount: 1000, note: "x".repeat(201) }, "Note must be at most 200 characters"],
    ["a date that is not a day", { amount: 1000, date: "yesterday" }, "Date must be a date in YYYY-MM-DD format"],
    ["a date that does not exist", { amount: 1000, date: "2026-02-30" }, "Date must be a date in YYYY-MM-DD format"],
  ])("refuses %s (400)", async (_label, body, message) => {
    const goal = await createGoal(user);
    const res = await postContribution(user, goal._id, body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message, code: expect.any(String) });
    expect(await savedInDatabase(goal._id)).toBe(0);
  });

  it("answers 404 for another user's goal and does not change it", async () => {
    const other = await registerUser();
    const goal = await createGoal(user);

    const res = await postContribution(other, goal._id, { amount: 5000 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: "Goal not found", code: expect.any(String) });
    expect(await savedInDatabase(goal._id)).toBe(0);

    // A withdrawal on another user's goal is 404 too, not the 400 of the owner
    expect((await postContribution(other, goal._id, { amount: -5000 })).status).toBe(404);
    expect((await postContribution(user, "not-an-id", { amount: 5000 })).status).toBe(404);
    expect((await postContribution(user, "6720f1b2c3d4e5f601234699", { amount: 5000 })).status).toBe(404);
  });

  it("adds up exactly when many deposits arrive at the same moment", async () => {
    const goal = await createGoal(user, { targetAmount: 100000000 });

    const responses = await Promise.all(
      Array.from({ length: 25 }, (_, i) => postContribution(user, goal._id, { amount: 1000 + i, note: `#${i}` }))
    );

    expect(responses.every((res) => res.status === 201)).toBe(true);
    const expected = Array.from({ length: 25 }, (_, i) => 1000 + i).reduce((sum, n) => sum + n, 0);
    const after = await getGoal(user, goal._id);
    expect(after.body.data.savedAmount).toBe(expected);
    expect(after.body.data.contributions).toHaveLength(25);
    expect(await savedInDatabase(goal._id)).toBe(expected);
  });

  it("lets only the withdrawals that the saved money can pay succeed when they arrive at the same moment", async () => {
    const goal = await createGoal(user);
    await postContribution(user, goal._id, { amount: 1000 });

    // 6 x 300 asked, only 1000 saved: exactly 3 can be paid
    const responses = await Promise.all(Array.from({ length: 6 }, () => postContribution(user, goal._id, { amount: -300 })));

    expect(responses.filter((res) => res.status === 201)).toHaveLength(3);
    expect(responses.filter((res) => res.status === 400)).toHaveLength(3);
    expect(await savedInDatabase(goal._id)).toBe(100);
    expect((await getGoal(user, goal._id)).body.data.contributions).toHaveLength(4);
  });

  it("keeps the total right when deposits and withdrawals are mixed at the same moment", async () => {
    const goal = await createGoal(user, { targetAmount: 100000000 });
    await postContribution(user, goal._id, { amount: 100000 });

    const responses = await Promise.all([
      ...Array.from({ length: 10 }, () => postContribution(user, goal._id, { amount: 500 })),
      ...Array.from({ length: 10 }, () => postContribution(user, goal._id, { amount: -200 })),
    ]);

    // 100.000 is enough for every withdrawal, so all 20 succeed: +5000 -2000
    expect(responses.every((res) => res.status === 201)).toBe(true);
    expect(await savedInDatabase(goal._id)).toBe(103000);
  });
});

describe("goals: delete a contribution", () => {
  let user;
  beforeAll(async () => {
    user = await registerUser();
  });

  function deleteContribution(who, goalId, contributionId) {
    return api().delete(`/api/goals/${goalId}/contributions/${contributionId}`).set(auth(who.token));
  }

  it("takes back a deposit that was entered by mistake", async () => {
    const goal = await createGoal(user);
    const first = await postContribution(user, goal._id, { amount: 300000, note: "right" });
    const second = await postContribution(user, goal._id, { amount: 700000, note: "typo" });
    const mistake = second.body.data.contributions.find((c) => c.note === "typo");
    expect(first.status).toBe(201);

    const res = await deleteContribution(user, goal._id, mistake._id);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ savedAmount: 300000, progress: 30, completed: false });
    expect(res.body.data.contributions.map((c) => c.note)).toEqual(["right"]);
    expect(await savedInDatabase(goal._id)).toBe(300000);
  });

  it("takes back a withdrawal, so the money returns to the goal", async () => {
    const goal = await createGoal(user);
    await postContribution(user, goal._id, { amount: 500000 });
    const withdrawal = await postContribution(user, goal._id, { amount: -200000, note: "oops" });
    const entry = withdrawal.body.data.contributions.find((c) => c.note === "oops");

    const res = await deleteContribution(user, goal._id, entry._id);

    expect(res.status).toBe(200);
    expect(res.body.data.savedAmount).toBe(500000);
    expect(res.body.data.contributions).toHaveLength(1);
  });

  it("can delete a deposit that completed the goal, which makes it unfinished again", async () => {
    const goal = await createGoal(user, { targetAmount: 1000 });
    const done = await postContribution(user, goal._id, { amount: 1000 });
    expect(done.body.data.completed).toBe(true);

    const res = await deleteContribution(user, goal._id, done.body.data.contributions[0]._id);
    expect(res.body.data).toMatchObject({ savedAmount: 0, completed: false });
  });

  it("refuses to delete a deposit whose money was already withdrawn (400) and changes nothing", async () => {
    const goal = await createGoal(user);
    const deposit = await postContribution(user, goal._id, { amount: 500000, note: "deposit" });
    await postContribution(user, goal._id, { amount: -400000 });
    const entry = deposit.body.data.contributions[0];

    const res = await deleteContribution(user, goal._id, entry._id);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: "Deleting this deposit would make the saved amount negative", code: expect.any(String) });
    expect(await savedInDatabase(goal._id)).toBe(100000);
    expect((await getGoal(user, goal._id)).body.data.contributions).toHaveLength(2);
  });

  it("answers 404 when the contribution was already deleted", async () => {
    const goal = await createGoal(user);
    const added = await postContribution(user, goal._id, { amount: 1000 });
    const entry = added.body.data.contributions[0];

    expect((await deleteContribution(user, goal._id, entry._id)).status).toBe(200);
    const again = await deleteContribution(user, goal._id, entry._id);
    expect(again.status).toBe(404);
    expect(again.body).toEqual({ success: false, message: "Contribution not found", code: expect.any(String) });
    expect(await savedInDatabase(goal._id)).toBe(0);
  });

  it("takes a contribution back only once when it is deleted twice at the same moment", async () => {
    const goal = await createGoal(user);
    await postContribution(user, goal._id, { amount: 5000 });
    const added = await postContribution(user, goal._id, { amount: 2000 });
    const entry = added.body.data.contributions[0];

    const responses = await Promise.all([
      deleteContribution(user, goal._id, entry._id),
      deleteContribution(user, goal._id, entry._id),
      deleteContribution(user, goal._id, entry._id),
    ]);

    expect(responses.filter((res) => res.status === 200)).toHaveLength(1);
    expect(responses.filter((res) => res.status === 404)).toHaveLength(2);
    expect(await savedInDatabase(goal._id)).toBe(5000);
  });

  it("answers 404 for another user's goal and does not change it", async () => {
    const other = await registerUser();
    const goal = await createGoal(user);
    const added = await postContribution(user, goal._id, { amount: 1000 });
    const entry = added.body.data.contributions[0];

    const res = await deleteContribution(other, goal._id, entry._id);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: "Goal not found", code: expect.any(String) });
    expect(await savedInDatabase(goal._id)).toBe(1000);
  });

  it("answers 404 for an unknown or malformed contribution id", async () => {
    const goal = await createGoal(user);
    const unknown = await deleteContribution(user, goal._id, "6720f1b2c3d4e5f601234699");
    expect(unknown.status).toBe(404);
    expect(unknown.body.message).toBe("Contribution not found");
    expect((await deleteContribution(user, goal._id, "not-an-id")).status).toBe(404);
    expect((await deleteContribution(user, "not-an-id", "6720f1b2c3d4e5f601234699")).status).toBe(404);
  });

  it("does not accept a contribution id that belongs to another goal of the same user", async () => {
    const goalA = await createGoal(user, { name: "A" });
    const goalB = await createGoal(user, { name: "B" });
    const added = await postContribution(user, goalA._id, { amount: 1000 });
    const entry = added.body.data.contributions[0];

    const res = await deleteContribution(user, goalB._id, entry._id);
    expect(res.status).toBe(404);
    expect(await savedInDatabase(goalA._id)).toBe(1000);
  });
});
