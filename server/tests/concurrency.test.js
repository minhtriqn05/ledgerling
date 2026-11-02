import { describe, expect, it } from "vitest";
import Notification from "../src/models/Notification.js";
import Transaction from "../src/models/Transaction.js";
import { currentMonth } from "../src/utils/month.js";
import { api, auth, findCategory, registerUser } from "./helpers.js";

// Requests that arrive at the same moment (two devices, a double click). Each case must end in a correct state,
// and a request that loses a race gets a 4xx in the usual format, never a 500.

const MONTH = currentMonth();
const parallel = (count, makeRequest) => Promise.all(Array.from({ length: count }, (_, i) => makeRequest(i)));

describe("requests at the same moment", () => {
  it("two expenses that both pass 80% of a budget give one warning, not two", async () => {
    const user = await registerUser();
    const food = await findCategory(user.token, "Food");
    await api().post("/api/budgets").set(auth(user.token)).send({ categoryId: food._id, month: MONTH, amount: 100000 });
    await api().post("/api/transactions").set(auth(user.token)).send({ categoryId: food._id, amount: 70000 });

    const answers = await parallel(2, () =>
      api().post("/api/transactions").set(auth(user.token)).send({ categoryId: food._id, amount: 6000 })
    );
    expect(answers.map((res) => res.status)).toEqual([201, 201]);
    expect(await Notification.countDocuments({ userId: user.user._id, type: "budget_warning" })).toBe(1);
  });

  it("five lists of notifications opened at once create one weekly summary", async () => {
    const user = await registerUser();
    const food = await findCategory(user.token, "Food");
    await api().post("/api/transactions").set(auth(user.token)).send({ categoryId: food._id, amount: 1000 });

    const answers = await parallel(5, () => api().get("/api/notifications").set(auth(user.token)));
    expect(answers.every((res) => res.status === 200)).toBe(true);
    expect(await Notification.countDocuments({ userId: user.user._id, type: "weekly_summary" })).toBe(1);
  });

  it("the same bulk delete from two devices deletes each transaction once and never fails with 500", async () => {
    const user = await registerUser();
    const food = await findCategory(user.token, "Food");
    const ids = [];
    for (let i = 0; i < 3; i += 1) {
      ids.push((await api().post("/api/transactions").set(auth(user.token)).send({ categoryId: food._id, amount: 1000 })).body.data._id);
    }
    const keep = (await api().post("/api/transactions").set(auth(user.token)).send({ categoryId: food._id, amount: 5 })).body.data._id;

    const answers = await parallel(2, () => api().post("/api/transactions/bulk-delete").set(auth(user.token)).send({ ids }));
    for (const res of answers) expect([200, 404]).toContain(res.status);
    const deleted = answers.filter((res) => res.status === 200).reduce((sum, res) => sum + res.body.data.deleted, 0);
    expect(deleted).toBe(3);
    expect(await Transaction.countDocuments({ userId: user.user._id })).toBe(1);
    expect(String((await Transaction.findOne({ userId: user.user._id }))._id)).toBe(keep);
  });

  it("the same category, budget or email sent twice at once: one is created, the other is a 409", async () => {
    const user = await registerUser();
    const food = await findCategory(user.token, "Food");
    const email = `twice-${Date.now()}@example.com`;

    const categories = await parallel(2, () =>
      api().post("/api/categories").set(auth(user.token)).send({ name: "Twice", type: "expense", color: "#22ADA3" })
    );
    const budgets = await parallel(2, () =>
      api().post("/api/budgets").set(auth(user.token)).send({ categoryId: food._id, month: "2099-05", amount: 1000 })
    );
    const accounts = await parallel(2, () => api().post("/api/auth/register").send({ name: "Twice", email, password: "secret123" }));

    for (const answers of [categories, budgets, accounts]) {
      expect(answers.map((res) => res.status).sort()).toEqual([201, 409]);
      const refused = answers.find((res) => res.status === 409);
      expect(refused.body).toEqual({ success: false, message: expect.any(String), code: expect.any(String) });
    }
  });
});
