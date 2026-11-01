import { describe, expect, it } from "vitest";
import { currentMonth } from "../src/utils/month.js";
import { api, auth, findCategory, registerUser } from "./helpers.js";

function postTransfer(token, body) {
  return api().post("/api/transfers").set(auth(token)).send(body);
}

async function get(token, path) {
  const res = await api().get(path).set(auth(token));
  expect(res.status, path).toBe(200);
  return res.body.data;
}

// A new user with the Cash wallet and a bank wallet that starts with 1.000.000
async function newUser() {
  const user = await registerUser();
  const [cash] = await get(user.token, "/api/wallets");
  const res = await api()
    .post("/api/wallets")
    .set(auth(user.token))
    .send({ name: "Bank", type: "bank", color: "#4A9FE3", initialBalance: 1000000 });
  return { ...user, cash, bank: res.body.data };
}

async function balances(user) {
  const wallets = await get(user.token, "/api/wallets");
  return Object.fromEntries(wallets.map((wallet) => [wallet.name, wallet.balance]));
}

describe("transfers: auth", () => {
  it("answers 401 without a token on every route", async () => {
    expect((await api().get("/api/transfers")).status).toBe(401);
    expect((await api().post("/api/transfers").send({})).status).toBe(401);
    expect((await api().delete("/api/transfers/000000000000000000000000")).status).toBe(401);
  });
});

describe("POST /api/transfers", () => {
  it("moves the money from one wallet to the other, and the total stays the same", async () => {
    const user = await newUser();
    const res = await postTransfer(user.token, {
      fromWalletId: user.bank._id,
      toWalletId: user.cash._id,
      amount: 300000,
      note: "  ATM  ",
      date: "2026-10-27T12:30:00+07:00",
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      amount: 300000,
      note: "ATM",
      date: "2026-10-27T05:30:00.000Z",
      from: { _id: user.bank._id, name: "Bank" },
      to: { _id: user.cash._id, name: "Cash" },
    });
    expect(res.body.data.userId).toBeUndefined();
    expect(await balances(user)).toEqual({ Bank: 700000, Cash: 300000 });

    const bank = await get(user.token, `/api/wallets/${user.bank._id}`);
    expect(bank).toMatchObject({ transfersOut: 300000, transfersIn: 0, income: 0, expense: 0 });
  });

  it("may take a wallet below 0", async () => {
    const user = await newUser();
    const res = await postTransfer(user.token, { fromWalletId: user.cash._id, toWalletId: user.bank._id, amount: 50 });
    expect(res.status).toBe(201);
    expect(await balances(user)).toEqual({ Bank: 1000050, Cash: -50 });
  });

  it("answers 400 for invalid input and changes nothing", async () => {
    const user = await newUser();
    const good = { fromWalletId: user.bank._id, toWalletId: user.cash._id, amount: 100 };
    const cases = [
      [{ ...good, fromWalletId: "abc" }, "VALIDATION_ERROR"],
      [{ ...good, toWalletId: undefined }, "VALIDATION_ERROR"],
      [{ ...good, toWalletId: user.bank._id }, "TRANSFER_SAME_WALLET"],
      [{ ...good, amount: 0 }, "AMOUNT_INVALID"],
      [{ ...good, amount: -5 }, "AMOUNT_INVALID"],
      [{ ...good, amount: "100" }, "AMOUNT_INVALID"],
      [{ ...good, date: "1" }, "DATE_INVALID"],
      [{ ...good, note: "x".repeat(201) }, "NOTE_TOO_LONG"],
      [{ ...good, note: 5 }, "VALIDATION_ERROR"],
    ];
    for (const [body, code] of cases) {
      const res = await postTransfer(user.token, body);
      expect(res.status, code).toBe(400);
      expect(res.body.code).toBe(code);
    }
    expect(await balances(user)).toEqual({ Bank: 1000000, Cash: 0 });
  });

  it("answers 404 when a wallet belongs to another user, and changes nothing", async () => {
    const user = await newUser();
    const stranger = await newUser();

    const from = await postTransfer(user.token, { fromWalletId: stranger.bank._id, toWalletId: user.cash._id, amount: 100 });
    expect(from.status).toBe(404);
    expect(from.body.code).toBe("WALLET_NOT_FOUND");

    const to = await postTransfer(user.token, { fromWalletId: user.bank._id, toWalletId: stranger.cash._id, amount: 100 });
    expect(to.status).toBe(404);
    expect(to.body.code).toBe("WALLET_NOT_FOUND");

    expect(await balances(user)).toEqual({ Bank: 1000000, Cash: 0 });
    expect(await balances(stranger)).toEqual({ Bank: 1000000, Cash: 0 });
  });

  it("answers 409 when a wallet is archived", async () => {
    const user = await newUser();
    await api().patch(`/api/wallets/${user.bank._id}`).set(auth(user.token)).send({ archived: true });

    const from = await postTransfer(user.token, { fromWalletId: user.bank._id, toWalletId: user.cash._id, amount: 100 });
    expect(from.status).toBe(409);
    expect(from.body.code).toBe("WALLET_ARCHIVED");

    const to = await postTransfer(user.token, { fromWalletId: user.cash._id, toWalletId: user.bank._id, amount: 100 });
    expect(to.status).toBe(409);
    expect(to.body.code).toBe("WALLET_ARCHIVED");
  });
});

describe("a transfer does not change any statistic", () => {
  it("leaves the summary, the reports, the insights, the budgets and the transaction list exactly as they were", async () => {
    const user = await newUser();
    const month = currentMonth();
    const food = await findCategory(user.token, "Food");
    const salary = await findCategory(user.token, "Salary");

    await api().post("/api/transactions").set(auth(user.token)).send({ categoryId: salary._id, amount: 5000000, walletId: user.bank._id });
    await api().post("/api/transactions").set(auth(user.token)).send({ categoryId: food._id, amount: 800000, walletId: user.cash._id });
    await api().post("/api/budgets").set(auth(user.token)).send({ categoryId: food._id, month, amount: 1000000 });

    const paths = [
      `/api/stats/summary?month=${month}`,
      `/api/reports/monthly?month=${month}`,
      `/api/reports/yearly?year=${month.slice(0, 4)}`,
      `/api/insights?month=${month}`,
      `/api/budgets?month=${month}`,
      `/api/transactions?month=${month}`,
      "/api/notifications",
    ];
    const read = () => Promise.all(paths.map((path) => get(user.token, path)));
    const before = await read();
    const walletsBefore = await balances(user);

    const res = await postTransfer(user.token, { fromWalletId: user.bank._id, toWalletId: user.cash._id, amount: 2000000 });
    expect(res.status).toBe(201);

    expect(await read()).toEqual(before);
    // The check above must not pass because the numbers were never there
    expect(before[0]).toMatchObject({ totalIncome: 5000000, totalExpense: 800000, balance: 4200000 });
    // The wallets did change, and the money in all of them together did not
    const walletsAfter = await balances(user);
    expect(walletsAfter).toEqual({ Bank: walletsBefore.Bank - 2000000, Cash: walletsBefore.Cash + 2000000 });
    expect(walletsAfter.Bank + walletsAfter.Cash).toBe(walletsBefore.Bank + walletsBefore.Cash);
  });
});

describe("GET /api/transfers", () => {
  it("lists my transfers newest first, one page at a time, with the wallet filter", async () => {
    const user = await newUser();
    const stranger = await newUser();
    const third = (
      await api().post("/api/wallets").set(auth(user.token)).send({ name: "MoMo", type: "ewallet", color: "#7D8CE8" })
    ).body.data;

    await postTransfer(user.token, { fromWalletId: user.bank._id, toWalletId: user.cash._id, amount: 1, date: "2026-10-01T12:00:00+07:00" });
    await postTransfer(user.token, { fromWalletId: user.cash._id, toWalletId: third._id, amount: 2, date: "2026-10-02T12:00:00+07:00" });
    await postTransfer(user.token, { fromWalletId: user.bank._id, toWalletId: third._id, amount: 3, date: "2026-10-03T12:00:00+07:00" });
    await postTransfer(stranger.token, { fromWalletId: stranger.bank._id, toWalletId: stranger.cash._id, amount: 99 });

    const page = await api().get("/api/transfers?limit=2").set(auth(user.token));
    expect(page.status).toBe(200);
    expect(page.body.data.map((t) => t.amount)).toEqual([3, 2]);
    expect(page.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });

    const next = await api().get("/api/transfers?limit=2&page=2").set(auth(user.token));
    expect(next.body.data.map((t) => t.amount)).toEqual([1]);

    const byWallet = await api().get(`/api/transfers?walletId=${user.cash._id}`).set(auth(user.token));
    expect(byWallet.body.data.map((t) => t.amount)).toEqual([2, 1]);
  });

  it("answers 400 for an invalid filter and 404 for another user's wallet", async () => {
    const user = await newUser();
    const stranger = await newUser();

    expect((await api().get("/api/transfers?walletId=abc").set(auth(user.token))).status).toBe(400);
    expect((await api().get("/api/transfers?page=0").set(auth(user.token))).status).toBe(400);
    expect((await api().get("/api/transfers?limit=101").set(auth(user.token))).status).toBe(400);

    const res = await api().get(`/api/transfers?walletId=${stranger.bank._id}`).set(auth(user.token));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("WALLET_NOT_FOUND");
  });
});

describe("DELETE /api/transfers/:id", () => {
  it("puts the money back", async () => {
    const user = await newUser();
    const created = await postTransfer(user.token, { fromWalletId: user.bank._id, toWalletId: user.cash._id, amount: 400 });
    expect(await balances(user)).toEqual({ Bank: 999600, Cash: 400 });

    const res = await api().delete(`/api/transfers/${created.body.data._id}`).set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(created.body.data._id);
    expect(await balances(user)).toEqual({ Bank: 1000000, Cash: 0 });
    expect(await get(user.token, "/api/transfers")).toEqual([]);
  });

  it("answers 404 for another user's transfer and for a malformed id", async () => {
    const user = await newUser();
    const stranger = await newUser();
    const created = await postTransfer(user.token, { fromWalletId: user.bank._id, toWalletId: user.cash._id, amount: 400 });

    for (const res of [
      await api().delete(`/api/transfers/${created.body.data._id}`).set(auth(stranger.token)),
      await api().delete("/api/transfers/not-an-id").set(auth(user.token)),
    ]) {
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("TRANSFER_NOT_FOUND");
    }
    expect(await balances(user)).toEqual({ Bank: 999600, Cash: 400 });
  });
});
