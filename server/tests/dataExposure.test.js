import { beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import User from "../src/models/User.js";
import Notification from "../src/models/Notification.js";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { currentMonth } from "../src/utils/month.js";
import { api, auth, findCategory, registerUser } from "./helpers.js";

// No answer carries what only the server may know: the password hash, the token version, internal ids of the owner,
// Mongoose's version key, the dedupe key of a notification, or a stack trace.

const MONTH = currentMonth();
const SECRETS = [/passwordHash/, /tokenVersion/, /\$2[aby]\$\d\d\$/, /"userId"/, /"__v"/, /dedupeKey/, /\bat .*\.js:\d+/];

let user;
let admin;

beforeAll(async () => {
  user = await registerUser();
  admin = await registerUser();
  await User.updateOne({ _id: admin.user._id }, { role: "admin" });

  // Something of every kind, so every list has items in it
  const food = await findCategory(user.token, "Food");
  const send = (method, path, body) => api()[method](path).set(auth(user.token)).send(body);
  const transaction = await send("post", "/api/transactions", { categoryId: food._id, amount: 50000, tags: ["lunch"] });
  await send("post", "/api/budgets", { categoryId: food._id, month: MONTH, amount: 60000 });
  await send("post", "/api/recurring", { categoryId: food._id, amount: 1000, frequency: "weekly", startDate: "2099-01-01" });
  const goal = await send("post", "/api/goals", { name: "Trip", targetAmount: 100000, color: "#4A9FE3" });
  await send("post", `/api/goals/${goal.body.data._id}/contributions`, { amount: 1000 });
  await send("post", "/api/templates", { name: "Tea", categoryId: food._id, amount: 20000 });
  const wallet = await send("post", "/api/wallets", { name: "Bank", type: "bank", color: "#4A9FE3" });
  const cash = (await api().get("/api/wallets").set(auth(user.token))).body.data.find((w) => w.isDefault);
  await send("post", "/api/transfers", { fromWalletId: cash._id, toWalletId: wallet.body.data._id, amount: 1000 });
  await send("patch", "/api/users/me/avatar", { type: "preset", value: "cat" });
  await Notification.create({ userId: user.user._id, type: "weekly_summary", title: "T", message: "M", dedupeKey: "exposure" });
  user.transactionId = transaction.body.data._id;
  user.goalId = goal.body.data._id;
});

function expectNoSecrets(label, text) {
  const found = SECRETS.filter((pattern) => pattern.test(text)).map(String);
  expect(found, `${label} leaks ${found.join(", ")}`).toEqual([]);
}

describe("no answer leaks internal data", () => {
  it("every read of a signed-in user", async () => {
    const paths = [
      "/api/auth/me",
      "/api/categories",
      `/api/transactions?month=${MONTH}`,
      `/api/transactions/${user.transactionId}`,
      `/api/transactions/export?month=${MONTH}`,
      `/api/stats/summary?month=${MONTH}`,
      `/api/budgets?month=${MONTH}`,
      "/api/tags",
      "/api/recurring",
      "/api/goals",
      `/api/goals/${user.goalId}`,
      `/api/reports/monthly?month=${MONTH}`,
      `/api/reports/yearly?year=${MONTH.slice(0, 4)}`,
      `/api/insights?month=${MONTH}`,
      "/api/templates",
      "/api/wallets",
      "/api/transfers",
      "/api/notifications",
      "/api/notifications/unread-count",
      "/api/users/me/export",
    ];
    for (const path of paths) {
      const res = await api().get(path).set(auth(user.token));
      expect(res.status, path).toBe(200);
      expectNoSecrets(path, res.text);
    }
  });

  it("the answers of the writes that return a user or a token", async () => {
    const answers = [
      await api().post("/api/auth/login").send({ email: user.email, password: user.password }),
      await api().patch("/api/users/me").set(auth(user.token)).send({ name: "Renamed" }),
      await api().patch("/api/users/me/preferences").set(auth(user.token)).send({ theme: "light" }),
    ];
    for (const res of answers) {
      expect(res.status).toBe(200);
      expectNoSecrets(res.req.path, res.text);
    }
  });

  it("the admin pages show other users without anything private", async () => {
    for (const path of ["/api/admin/stats", "/api/admin/users"]) {
      const res = await api().get(path).set(auth(admin.token));
      expect(res.status, path).toBe(200);
      expectNoSecrets(path, res.text);
    }
  });

  it("error answers", async () => {
    const answers = [
      await api().get("/api/transactions/000000000000000000000000").set(auth(user.token)),
      await api().post("/api/transactions").set(auth(user.token)).send({ amount: "x" }),
      await api().post("/api/auth/login").set("Content-Type", "application/json").send("{bad"),
      await api().get("/api/nothing"),
    ];
    for (const res of answers) {
      expect(res.body.success).toBe(false);
      expectNoSecrets(res.req.path, res.text);
    }
  });
});

describe("error handler in production", () => {
  it("answers a database validation error with a fixed message, not the schema's own text", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const app = express();
      app.get("/invalid", async () => {
        // A document the schema refuses: Mongoose names the model, the path and the value in its message
        await new Notification({ userId: new mongoose.Types.ObjectId(), type: "nope" }).validate();
      });
      app.use(errorHandler);

      const res = await request(app).get("/invalid");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ success: false, message: "Invalid input", code: "VALIDATION_ERROR" });
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("keeps the details of a validation error outside production, where they help to debug", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const app = express();
      app.get("/invalid", async () => {
        await new Notification({ userId: new mongoose.Types.ObjectId(), type: "nope" }).validate();
      });
      app.use(errorHandler);

      const res = await request(app).get("/invalid");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Notification validation failed");
    } finally {
      log.mockRestore();
    }
  });
});
