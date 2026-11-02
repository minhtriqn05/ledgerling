import { afterEach, describe, expect, it, vi } from "vitest";
import Notification from "../src/models/Notification.js";
import { api, auth, findCategory, registerUser } from "./helpers.js";

// The places that count by day or month in Vietnam time (UTC+7) and had no test at a boundary yet:
// budgets, the month a page opens on by default, and the 7 days of the weekly summary.
// Only Date is faked (real timers keep MongoDB working). The clock is set before registerUser: tokens last 1 hour.

function setNow(isoMoment) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(isoMoment));
}

afterEach(() => {
  vi.useRealTimers();
});

async function newUser() {
  const user = await registerUser();
  return { ...user, food: await findCategory(user.token, "Food") };
}

const get = (user, path) => api().get(path).set(auth(user.token));
const add = (user, amount, date) =>
  api().post("/api/transactions").set(auth(user.token)).send({ categoryId: user.food._id, amount, date });

describe("Vietnam time at the edges", () => {
  it("a budget counts 23:30 on the last day of its month, and not 00:30 on the 1st of the next one", async () => {
    setNow("2026-11-15T12:00:00+07:00");
    const user = await newUser();
    await add(user, 30000, "2026-10-31T23:30:00+07:00"); // 16:30 UTC, still 31 October
    await add(user, 70000, "2026-11-01T00:30:00+07:00"); // 31 October 17:30 UTC, but November in Vietnam
    for (const month of ["2026-10", "2026-11"]) {
      await api().post("/api/budgets").set(auth(user.token)).send({ categoryId: user.food._id, month, amount: 100000 });
    }

    const october = (await get(user, "/api/budgets?month=2026-10")).body.data[0];
    const november = (await get(user, "/api/budgets?month=2026-11")).body.data[0];
    expect([october.spent, november.spent]).toEqual([30000, 70000]);
  });

  it("at 00:30 on 1 November in Vietnam (still 31 October in UTC) every page opens on November", async () => {
    setNow("2026-10-31T17:30:00Z");
    const user = await newUser();
    await add(user, 20000, "2026-10-31T23:00:00+07:00"); // October
    await add(user, 5000, "2026-11-01T00:10:00+07:00"); // November, 20 minutes ago

    const list = await get(user, "/api/transactions");
    const summary = await get(user, "/api/stats/summary");
    const report = await get(user, "/api/reports/monthly");
    const insights = await get(user, "/api/insights");
    const yearly = await get(user, "/api/reports/yearly");

    expect(list.body.data.map((t) => t.amount)).toEqual([5000]);
    expect([summary.body.data.month, summary.body.data.totalExpense]).toEqual(["2026-11", 5000]);
    expect([report.body.data.month, report.body.data.totals.expense]).toEqual(["2026-11", 5000]);
    expect(report.body.data.dailyExpense[0]).toEqual({ date: "2026-11-01", total: 5000 });
    expect(insights.body.data.month).toBe("2026-11");
    expect(yearly.body.data.months.slice(9, 11).map((m) => m.expense)).toEqual([20000, 5000]);
  });

  it("the weekly summary covers today and the 6 days before it, in Vietnam time", async () => {
    // Friday 6 November 2026, 00:30 in Vietnam = Thursday 5 November 17:30 UTC
    setNow("2026-11-05T17:30:00Z");
    const user = await newUser();
    await add(user, 1000, "2026-10-30T23:30:00+07:00"); // 7 days ago: outside
    await add(user, 2000, "2026-10-31T00:30:00+07:00"); // 6 days ago: inside
    await add(user, 4000, "2026-11-06T00:15:00+07:00"); // today: inside

    await get(user, "/api/notifications");
    const summary = await Notification.findOne({ userId: user.user._id, type: "weekly_summary" }).lean();
    expect(summary.params).toMatchObject({ total: 6000, count: 2, from: "2026-10-31", to: "2026-11-06" });
    expect(summary.dedupeKey).toBe("weekly:2026-W45");
  });
});
