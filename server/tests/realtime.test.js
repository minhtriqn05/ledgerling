import { createServer } from "node:http";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { io as connect } from "socket.io-client";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import User from "../src/models/User.js";
import { attachSocket, closeSocket } from "../src/services/realtimeService.js";
import { currentMonth } from "../src/utils/month.js";
import { api, auth, findCategory, registerUser } from "./helpers.js";

// Phase 22: real-time events. A real HTTP server with Socket.IO, and real clients connecting to it.

let url;
let server;
const open = []; // every socket of a test, closed after it

beforeAll(async () => {
  server = createServer(app);
  attachSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://localhost:${server.address().port}`;
});

afterEach(() => {
  open.splice(0).forEach((socket) => socket.close());
});

afterAll(async () => {
  await closeSocket(); // also closes the HTTP server
});

function newSocket(auth) {
  const socket = connect(url, { auth, transports: ["websocket"], reconnection: false, forceNew: true });
  open.push(socket);
  // Everything this socket receives, in order
  socket.received = [];
  socket.onAny((event, payload) => socket.received.push({ event, payload }));
  return socket;
}

// A connected socket of this user
function connected(token) {
  const socket = newSocket({ token });
  return new Promise((resolve, reject) => {
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

// The error a socket is refused with
function refused(auth) {
  const socket = newSocket(auth);
  return new Promise((resolve, reject) => {
    socket.once("connect", () => reject(new Error("the connection was accepted")));
    socket.once("connect_error", (err) => resolve(err.message));
  });
}

// Waits for the next matching event of a socket, or fails after a moment
function nextEvent(socket, event, matches = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${event} arrived`)), 2000);
    function listener(payload) {
      if (!matches(payload)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(payload);
    }
    socket.on(event, listener);
  });
}

const changed = (resource) => (payload) => payload.resource === resource;

function disconnected(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("the socket stayed connected")), 2000);
    socket.once("disconnect", (reason) => {
      clearTimeout(timer);
      resolve(reason);
    });
  });
}

// Long enough for an event that should not come to arrive anyway
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

async function addTransaction(user, extra = {}, headers = {}) {
  const food = await findCategory(user.token, "Food");
  const res = await api()
    .post("/api/transactions")
    .set({ ...auth(user.token), ...headers })
    .send({ categoryId: food._id, amount: 45000, note: "Lunch", ...extra });
  expect(res.status).toBe(201);
  return res.body.data;
}

describe("connecting", () => {
  it("refuses a connection without a token", async () => {
    expect(await refused({})).toBe("TOKEN_MISSING");
  });

  it("refuses a token that is not valid", async () => {
    expect(await refused({ token: "not-a-token" })).toBe("TOKEN_INVALID");
    expect(await refused({ token: jwt.sign({ sub: "abc" }, "another-secret") })).toBe("TOKEN_INVALID");
    expect(await refused({ token: { $ne: null } })).toBe("TOKEN_INVALID");
  });

  it("accepts a valid token", async () => {
    const user = await registerUser();
    const socket = await connected(user.token);
    expect(socket.connected).toBe(true);
  });

  it("refuses a token of an older tokenVersion", async () => {
    const user = await registerUser();
    await api().post("/api/auth/logout-all").set(auth(user.token)).expect(200);
    expect(await refused({ token: user.token })).toBe("TOKEN_INVALID");
  });

  it("refuses a disabled account and a deleted one", async () => {
    const disabled = await registerUser();
    await User.updateOne({ email: disabled.email }, { status: "disabled" });
    expect(await refused({ token: disabled.token })).toBe("TOKEN_INVALID");

    const deleted = await registerUser();
    await User.deleteOne({ email: deleted.email });
    expect(await refused({ token: deleted.token })).toBe("TOKEN_INVALID");
  });
});

describe("data:changed", () => {
  it("reaches the user after a new transaction, with only the name of the resource", async () => {
    const user = await registerUser();
    const socket = await connected(user.token);

    const event = nextEvent(socket, "data:changed", changed("transactions"));
    await addTransaction(user);
    expect(await event).toEqual({ resource: "transactions" });
  });

  it("reaches every device of the user", async () => {
    const user = await registerUser();
    const phone = await connected(user.token);
    const laptop = await connected(user.token);

    const events = [nextEvent(phone, "data:changed"), nextEvent(laptop, "data:changed")];
    await addTransaction(user);
    await Promise.all(events);
  });

  it("never reaches another user", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const aliceSocket = await connected(alice.token);
    const bobSocket = await connected(bob.token);

    const event = nextEvent(aliceSocket, "data:changed", changed("transactions"));
    await addTransaction(alice);
    await event;
    await settle();
    expect(bobSocket.received).toEqual([]);
  });

  it("skips the device that made the change (X-Socket-Id), not the others", async () => {
    const user = await registerUser();
    const sender = await connected(user.token);
    const other = await connected(user.token);

    const event = nextEvent(other, "data:changed", changed("transactions"));
    await addTransaction(user, {}, { "X-Socket-Id": sender.id });
    await event;
    await settle();
    expect(sender.received.filter((e) => e.payload.resource === "transactions")).toEqual([]);
  });

  it("names the resource for each kind of change: create, update and delete", async () => {
    const user = await registerUser();
    const socket = await connected(user.token);
    const headers = auth(user.token);
    const food = await findCategory(user.token, "Food");

    // Runs a request, and expects the event of that resource to follow it
    async function expectEvent(resource, send) {
      const event = nextEvent(socket, "data:changed", changed(resource));
      const res = await send();
      expect(res.status).toBeLessThan(300);
      await event;
      return res.body.data;
    }

    const transaction = await addTransaction(user);
    await expectEvent("transactions", () => api().patch(`/api/transactions/${transaction._id}`).set(headers).send({ amount: 50000 }));
    await expectEvent("transactions", () => api().delete(`/api/transactions/${transaction._id}`).set(headers));

    const category = await expectEvent("categories", () => api().post("/api/categories").set(headers).send({ name: "Pets", type: "expense", color: "#4A9FE3" }));
    await expectEvent("categories", () => api().patch(`/api/categories/${category._id}`).set(headers).send({ name: "Animals" }));
    await expectEvent("categories", () => api().delete(`/api/categories/${category._id}`).set(headers));

    const budget = await expectEvent("budgets", () => api().post("/api/budgets").set(headers).send({ categoryId: food._id, month: currentMonth(), amount: 5000000 }));
    await expectEvent("budgets", () => api().patch(`/api/budgets/${budget._id}`).set(headers).send({ amount: 6000000 }));
    await expectEvent("budgets", () => api().delete(`/api/budgets/${budget._id}`).set(headers));

    const rule = await expectEvent("recurring", () =>
      api().post("/api/recurring").set(headers).send({ categoryId: food._id, amount: 100000, note: "Box", frequency: "monthly", startDate: "2099-01-01" })
    );
    await expectEvent("recurring", () => api().patch(`/api/recurring/${rule._id}/toggle`).set(headers));
    await expectEvent("recurring", () => api().delete(`/api/recurring/${rule._id}`).set(headers));

    const goal = await expectEvent("goals", () => api().post("/api/goals").set(headers).send({ name: "Trip", targetAmount: 1000000, color: "#4A9FE3" }));
    await expectEvent("goals", () => api().post(`/api/goals/${goal._id}/contributions`).set(headers).send({ amount: 1000 }));
    await expectEvent("goals", () => api().delete(`/api/goals/${goal._id}`).set(headers));

    const template = await expectEvent("templates", () => api().post("/api/templates").set(headers).send({ name: "Coffee", categoryId: food._id, amount: 35000 }));
    await expectEvent("templates", () => api().patch(`/api/templates/${template._id}`).set(headers).send({ amount: 40000 }));
    await expectEvent("templates", () => api().delete(`/api/templates/${template._id}`).set(headers));

    await expectEvent("notifications", () => api().patch("/api/notifications/read-all").set(headers));
  });

  it("stays silent for a read and for a request that failed", async () => {
    const user = await registerUser();
    const socket = await connected(user.token);
    const headers = auth(user.token);

    await api().get("/api/transactions").set(headers).expect(200);
    await api().post("/api/transactions").set(headers).send({ amount: -1 }).expect(400);
    await api().delete("/api/goals/64b000000000000000000000").set(headers).expect(404);
    await settle();
    expect(socket.received).toEqual([]);
  });

  it("is sent when a recurring rule creates transactions during a read", async () => {
    const user = await registerUser();
    const bills = await findCategory(user.token, "Bills");
    const socket = await connected(user.token);

    // Creating the rule is silent about transactions; the next read runs it
    const event = nextEvent(socket, "data:changed", changed("transactions"));
    await api()
      .post("/api/recurring")
      .set(auth(user.token))
      .send({ categoryId: bills._id, amount: 100000, note: "Rent", frequency: "monthly", startDate: "2026-01-01" })
      .expect(201);
    await api().get("/api/transactions").set(auth(user.token)).expect(200);
    await event;
  });
});

describe("notification:new", () => {
  // A budget of 100,000 and an expense of 90,000 pass the 80% warning
  async function overspend(user) {
    const food = await findCategory(user.token, "Food");
    await api().post("/api/budgets").set(auth(user.token)).send({ categoryId: food._id, month: currentMonth(), amount: 100000 }).expect(201);
    await addTransaction(user, { amount: 90000 });
  }

  it("reaches the user, followed by data:changed for the notifications, and holds no text", async () => {
    const user = await registerUser();
    const socket = await connected(user.token);

    const events = [nextEvent(socket, "notification:new"), nextEvent(socket, "data:changed", changed("notifications"))];
    await overspend(user);
    const [notification] = await Promise.all(events);
    expect(Object.keys(notification).sort()).toEqual(["id", "type"]);
    expect(notification.type).toBe("budget_warning");
  });

  it("is also sent to the device that made the change", async () => {
    const user = await registerUser();
    const socket = await connected(user.token);
    const food = await findCategory(user.token, "Food");
    await api().post("/api/budgets").set(auth(user.token)).send({ categoryId: food._id, month: currentMonth(), amount: 100000 }).expect(201);

    const event = nextEvent(socket, "notification:new");
    await addTransaction(user, { amount: 90000 }, { "X-Socket-Id": socket.id });
    await event;
  });

  it("never reaches another user", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const aliceSocket = await connected(alice.token);
    const bobSocket = await connected(bob.token);

    const event = nextEvent(aliceSocket, "notification:new");
    await overspend(alice);
    await event;
    await settle();
    expect(bobSocket.received).toEqual([]);
  });
});

describe("the sockets of a user are closed", () => {
  it("on log out of all devices; the new token connects, the old one does not", async () => {
    const user = await registerUser();
    const other = await registerUser();
    const phone = await connected(user.token);
    const laptop = await connected(user.token);
    const stranger = await connected(other.token);

    const closed = [disconnected(phone), disconnected(laptop)];
    const res = await api().post("/api/auth/logout-all").set(auth(user.token)).expect(200);
    expect(await Promise.all(closed)).toEqual(["io server disconnect", "io server disconnect"]);

    await settle();
    expect(stranger.connected).toBe(true);
    expect(await refused({ token: user.token })).toBe("TOKEN_INVALID");
    expect((await connected(res.body.data.token)).connected).toBe(true);
  });

  it("on a password change", async () => {
    const user = await registerUser();
    const socket = await connected(user.token);

    const closed = disconnected(socket);
    await api()
      .patch("/api/users/me/password")
      .set(auth(user.token))
      .send({ currentPassword: user.password, newPassword: "another-secret-1" })
      .expect(200);
    await closed;
    expect(await refused({ token: user.token })).toBe("TOKEN_INVALID");
  });

  it("not when the current password was wrong", async () => {
    const user = await registerUser();
    const socket = await connected(user.token);

    await api().patch("/api/users/me/password").set(auth(user.token)).send({ currentPassword: "wrong-password", newPassword: "another-secret-1" }).expect(400);
    await settle();
    expect(socket.connected).toBe(true);
  });

  it("when an admin disables the account, not when an admin enables one", async () => {
    const admin = await registerUser();
    await User.updateOne({ email: admin.email }, { role: "admin" });
    const user = await registerUser();
    const socket = await connected(user.token);
    const adminSocket = await connected(admin.token);

    await api().patch(`/api/admin/users/${user.user._id}/status`).set(auth(admin.token)).send({ status: "active" }).expect(200);
    await settle();
    expect(socket.connected).toBe(true);

    const closed = disconnected(socket);
    await api().patch(`/api/admin/users/${user.user._id}/status`).set(auth(admin.token)).send({ status: "disabled" }).expect(200);
    await closed;
    expect(adminSocket.connected).toBe(true);
    expect(await refused({ token: user.token })).toBe("TOKEN_INVALID");
  });

  it("when the account is deleted", async () => {
    const user = await registerUser();
    const socket = await connected(user.token);

    const closed = disconnected(socket);
    await api().delete("/api/users/me").set(auth(user.token)).send({ password: user.password }).expect(200);
    await closed;
  });
});
