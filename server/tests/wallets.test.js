import { beforeAll, describe, expect, it } from "vitest";
import Transaction from "../src/models/Transaction.js";
import Wallet from "../src/models/Wallet.js";
import Transfer from "../src/models/Transfer.js";
import { ensureDefaultWallet } from "../src/services/walletService.js";
import { api, auth, findCategory, registerUser } from "./helpers.js";

const NEW_WALLET = { name: "Vietcombank", type: "bank", color: "#4A9FE3", initialBalance: 1000000 };

function listWallets(token) {
  return api().get("/api/wallets").set(auth(token));
}

function postWallet(token, body) {
  return api().post("/api/wallets").set(auth(token)).send(body);
}

function postTransaction(token, body) {
  return api().post("/api/transactions").set(auth(token)).send(body);
}

// Creates a wallet and returns it. overrides change only what the test is about.
async function createWallet(user, overrides = {}) {
  const res = await postWallet(user.token, { ...NEW_WALLET, ...overrides });
  expect(res.status).toBe(201);
  return res.body.data;
}

async function cashOf(user) {
  const res = await listWallets(user.token);
  return res.body.data.find((wallet) => wallet.isDefault);
}

async function balanceOf(user, walletId) {
  const res = await api().get(`/api/wallets/${walletId}`).set(auth(user.token));
  expect(res.status).toBe(200);
  return res.body.data.balance;
}

// A new user with their Food (expense) and Salary (income) categories
async function newUser() {
  const user = await registerUser();
  return { ...user, food: await findCategory(user.token, "Food"), salary: await findCategory(user.token, "Salary") };
}

describe("wallets: auth", () => {
  it("answers 401 without a token on every route", async () => {
    const id = "000000000000000000000000";
    expect((await api().get("/api/wallets")).status).toBe(401);
    expect((await api().post("/api/wallets").send(NEW_WALLET)).status).toBe(401);
    expect((await api().get(`/api/wallets/${id}`)).status).toBe(401);
    expect((await api().patch(`/api/wallets/${id}`).send({ name: "A" })).status).toBe(401);
    expect((await api().delete(`/api/wallets/${id}`)).status).toBe(401);
  });
});

describe("the default Cash wallet", () => {
  it("every user has one, without creating it first", async () => {
    const user = await registerUser();
    const res = await listWallets(user.token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ name: "Cash", type: "cash", isDefault: true, archived: false, initialBalance: 0, balance: 0 });
    expect(res.body.data[0].userId).toBeUndefined();
  });

  it("stays one wallet when many requests ask for it at the same time", async () => {
    const user = await registerUser();
    await Promise.all(Array.from({ length: 5 }, () => ensureDefaultWallet(user.user._id)));
    expect(await Wallet.countDocuments({ userId: user.user._id, isDefault: true })).toBe(1);
  });

  it("cannot be archived or deleted", async () => {
    const user = await registerUser();
    const cash = await cashOf(user);

    const archived = await api().patch(`/api/wallets/${cash._id}`).set(auth(user.token)).send({ archived: true });
    expect(archived.status).toBe(409);
    expect(archived.body.code).toBe("WALLET_DEFAULT_LOCKED");

    const removed = await api().delete(`/api/wallets/${cash._id}`).set(auth(user.token));
    expect(removed.status).toBe(409);
    expect(removed.body.code).toBe("WALLET_DEFAULT_LOCKED");
  });

  it("can be renamed", async () => {
    const user = await registerUser();
    const cash = await cashOf(user);
    const res = await api().patch(`/api/wallets/${cash._id}`).set(auth(user.token)).send({ name: "Pocket money" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: "Pocket money", isDefault: true });
  });
});

describe("wallets: create, read, update, delete", () => {
  it("creates a wallet and ignores userId and isDefault from the body", async () => {
    const user = await registerUser();
    const other = await registerUser();
    const res = await postWallet(user.token, { ...NEW_WALLET, userId: other.user._id, isDefault: true });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ ...NEW_WALLET, isDefault: false, archived: false, balance: 1000000 });
    expect(await Wallet.countDocuments({ userId: other.user._id, name: NEW_WALLET.name })).toBe(0);
  });

  it("answers 400 for invalid input", async () => {
    const user = await registerUser();
    const cases = [
      [{ ...NEW_WALLET, name: "  " }, "NAME_REQUIRED"],
      [{ ...NEW_WALLET, name: "x".repeat(31) }, "NAME_TOO_LONG"],
      [{ ...NEW_WALLET, type: "gold" }, "WALLET_TYPE_INVALID"],
      [{ ...NEW_WALLET, color: "blue" }, "COLOR_INVALID"],
      [{ ...NEW_WALLET, initialBalance: -1 }, "WALLET_BALANCE_INVALID"],
      [{ ...NEW_WALLET, initialBalance: "5" }, "WALLET_BALANCE_INVALID"],
    ];
    for (const [body, code] of cases) {
      const res = await postWallet(user.token, body);
      expect(res.status, code).toBe(400);
      expect(res.body.code).toBe(code);
    }
  });

  it("answers 409 for a name the user already has, ignoring case", async () => {
    const user = await registerUser();
    const first = await createWallet(user);
    const second = await createWallet(user, { name: "MoMo", type: "ewallet" });

    const created = await postWallet(user.token, { ...NEW_WALLET, name: "VIETCOMBANK" });
    expect(created.status).toBe(409);
    expect(created.body.code).toBe("WALLET_EXISTS");

    const renamed = await api().patch(`/api/wallets/${second._id}`).set(auth(user.token)).send({ name: first.name });
    expect(renamed.status).toBe(409);
    expect(renamed.body.code).toBe("WALLET_EXISTS");
  });

  it("two users can use the same name", async () => {
    await createWallet(await registerUser());
    await createWallet(await registerUser());
  });

  it("updates the fields and refuses an empty or invalid change", async () => {
    const user = await registerUser();
    const wallet = await createWallet(user);
    const path = `/api/wallets/${wallet._id}`;

    const res = await api().patch(path).set(auth(user.token)).send({ name: "ACB", color: "#22ADA3", initialBalance: 5000 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: "ACB", color: "#22ADA3", balance: 5000 });

    expect((await api().patch(path).set(auth(user.token)).send({})).status).toBe(400);
    expect((await api().patch(path).set(auth(user.token)).send({ archived: "yes" })).status).toBe(400);
    expect((await api().patch(path).set(auth(user.token)).send({ type: "gold" })).body.code).toBe("WALLET_TYPE_INVALID");
  });

  it("answers 404 for another user's wallet and for a malformed id", async () => {
    const owner = await registerUser();
    const stranger = await registerUser();
    const wallet = await createWallet(owner);
    const path = `/api/wallets/${wallet._id}`;

    for (const res of [
      await api().get(path).set(auth(stranger.token)),
      await api().patch(path).set(auth(stranger.token)).send({ name: "Mine" }),
      await api().delete(path).set(auth(stranger.token)),
      await api().get("/api/wallets/not-an-id").set(auth(owner.token)),
    ]) {
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("WALLET_NOT_FOUND");
    }
    expect((await api().get(path).set(auth(owner.token))).body.data.name).toBe(NEW_WALLET.name);
  });

  it("deletes an unused wallet, and refuses one with transactions or transfers", async () => {
    const user = await newUser();
    const unused = await createWallet(user, { name: "Unused" });
    const withTransaction = await createWallet(user, { name: "With transaction" });
    const withTransfer = await createWallet(user, { name: "With transfer" });
    const cash = await cashOf(user);

    await postTransaction(user.token, { categoryId: user.food._id, amount: 1000, walletId: withTransaction._id });
    await api()
      .post("/api/transfers")
      .set(auth(user.token))
      .send({ fromWalletId: cash._id, toWalletId: withTransfer._id, amount: 1000 });

    expect((await api().delete(`/api/wallets/${unused._id}`).set(auth(user.token))).status).toBe(200);
    expect((await api().get(`/api/wallets/${unused._id}`).set(auth(user.token))).status).toBe(404);

    for (const wallet of [withTransaction, withTransfer]) {
      const res = await api().delete(`/api/wallets/${wallet._id}`).set(auth(user.token));
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("WALLET_IN_USE");
    }
  });
});

describe("wallet balance", () => {
  it("is the initial balance + income - expense", async () => {
    const user = await newUser();
    const wallet = await createWallet(user, { initialBalance: 1000000 });

    await postTransaction(user.token, { categoryId: user.salary._id, amount: 500000, walletId: wallet._id });
    await postTransaction(user.token, { categoryId: user.food._id, amount: 200000, walletId: wallet._id });
    await postTransaction(user.token, { categoryId: user.food._id, amount: 50000, walletId: wallet._id });

    const res = await api().get(`/api/wallets/${wallet._id}`).set(auth(user.token));
    expect(res.body.data).toMatchObject({ income: 500000, expense: 250000, balance: 1250000 });
  });

  it("counts every month, and only the wallet's own transactions", async () => {
    const user = await newUser();
    const wallet = await createWallet(user, { initialBalance: 0 });
    const cash = await cashOf(user);

    await postTransaction(user.token, { categoryId: user.salary._id, amount: 100, walletId: wallet._id, date: "2024-01-15T12:00:00+07:00" });
    await postTransaction(user.token, { categoryId: user.salary._id, amount: 10, walletId: wallet._id });
    await postTransaction(user.token, { categoryId: user.salary._id, amount: 7, walletId: cash._id });

    expect(await balanceOf(user, wallet._id)).toBe(110);
    expect(await balanceOf(user, cash._id)).toBe(7);
  });

  it("follows an edit, a move to another wallet and a delete", async () => {
    const user = await newUser();
    const first = await createWallet(user, { name: "First", initialBalance: 1000 });
    const second = await createWallet(user, { name: "Second", initialBalance: 1000 });

    const created = await postTransaction(user.token, { categoryId: user.food._id, amount: 100, walletId: first._id });
    expect(created.body.data.wallet).toMatchObject({ _id: first._id, name: "First" });
    const path = `/api/transactions/${created.body.data._id}`;
    expect(await balanceOf(user, first._id)).toBe(900);

    await api().patch(path).set(auth(user.token)).send({ amount: 300 });
    expect(await balanceOf(user, first._id)).toBe(700);

    const moved = await api().patch(path).set(auth(user.token)).send({ walletId: second._id });
    expect(moved.status).toBe(200);
    expect(moved.body.data.wallet.name).toBe("Second");
    expect(await balanceOf(user, first._id)).toBe(1000);
    expect(await balanceOf(user, second._id)).toBe(700);

    await api().delete(path).set(auth(user.token));
    expect(await balanceOf(user, second._id)).toBe(1000);
  });

  it("does not add another currency as VND", async () => {
    const user = await newUser();
    const wallet = await createWallet(user, { initialBalance: 0 });
    await postTransaction(user.token, { categoryId: user.salary._id, amount: 10, currency: "USD", walletId: wallet._id });
    expect(await balanceOf(user, wallet._id)).toBe(0);
  });
});

describe("transactions and wallets", () => {
  it("a new transaction without a walletId is saved in the default wallet", async () => {
    const user = await newUser();
    const cash = await cashOf(user);

    const res = await postTransaction(user.token, { categoryId: user.food._id, amount: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.data.wallet).toMatchObject({ _id: cash._id, name: "Cash" });
    const saved = await Transaction.findById(res.body.data._id);
    expect(String(saved.walletId)).toBe(cash._id);
  });

  it("answers 400 for a malformed wallet id, on create, update and the filter", async () => {
    const user = await newUser();
    const created = await postTransaction(user.token, { categoryId: user.food._id, amount: 1000 });

    expect((await postTransaction(user.token, { categoryId: user.food._id, amount: 1000, walletId: "abc" })).status).toBe(400);
    expect((await api().patch(`/api/transactions/${created.body.data._id}`).set(auth(user.token)).send({ walletId: "abc" })).status).toBe(400);
    expect((await api().get("/api/transactions?walletId=abc").set(auth(user.token))).status).toBe(400);
  });

  it("answers 404 for another user's wallet, on create, update, filter and export", async () => {
    const user = await newUser();
    const strangersWallet = await createWallet(await registerUser());
    const created = await postTransaction(user.token, { categoryId: user.food._id, amount: 1000 });

    for (const res of [
      await postTransaction(user.token, { categoryId: user.food._id, amount: 1000, walletId: strangersWallet._id }),
      await api().patch(`/api/transactions/${created.body.data._id}`).set(auth(user.token)).send({ walletId: strangersWallet._id }),
      await api().get(`/api/transactions?walletId=${strangersWallet._id}`).set(auth(user.token)),
      await api().get(`/api/transactions/export?walletId=${strangersWallet._id}`).set(auth(user.token)),
    ]) {
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("WALLET_NOT_FOUND");
    }
  });

  it("an archived wallet takes no new transactions, but keeps its balance and its old ones can be edited", async () => {
    const user = await newUser();
    const wallet = await createWallet(user, { initialBalance: 1000 });
    const created = await postTransaction(user.token, { categoryId: user.food._id, amount: 100, walletId: wallet._id });
    const path = `/api/transactions/${created.body.data._id}`;

    const archived = await api().patch(`/api/wallets/${wallet._id}`).set(auth(user.token)).send({ archived: true });
    expect(archived.body.data).toMatchObject({ archived: true, balance: 900 });

    const refused = await postTransaction(user.token, { categoryId: user.food._id, amount: 100, walletId: wallet._id });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe("WALLET_ARCHIVED");

    const edited = await api().patch(path).set(auth(user.token)).send({ note: "Old", walletId: wallet._id });
    expect(edited.status).toBe(200);

    const cash = await cashOf(user);
    await api().patch(path).set(auth(user.token)).send({ walletId: cash._id });
    const back = await api().patch(path).set(auth(user.token)).send({ walletId: wallet._id });
    expect(back.status).toBe(409);
    expect(back.body.code).toBe("WALLET_ARCHIVED");

    const restored = await api().patch(`/api/wallets/${wallet._id}`).set(auth(user.token)).send({ archived: false });
    expect(restored.body.data.archived).toBe(false);
    expect((await postTransaction(user.token, { categoryId: user.food._id, amount: 100, walletId: wallet._id })).status).toBe(201);
  });

  it("filters the list and the export by wallet", async () => {
    const user = await newUser();
    const wallet = await createWallet(user);
    await postTransaction(user.token, { categoryId: user.food._id, amount: 111, note: "in bank", walletId: wallet._id });
    await postTransaction(user.token, { categoryId: user.food._id, amount: 222, note: "in cash" });

    const list = await api().get(`/api/transactions?walletId=${wallet._id}`).set(auth(user.token));
    expect(list.body.data.map((t) => t.note)).toEqual(["in bank"]);
    expect(list.body.meta.total).toBe(1);

    const csv = await api().get(`/api/transactions/export?walletId=${wallet._id}`).set(auth(user.token));
    expect(csv.text).toContain("in bank");
    expect(csv.text).not.toContain("in cash");
  });

  it("a CSV import goes to the default wallet", async () => {
    const user = await newUser();
    const cash = await cashOf(user);
    const res = await api()
      .post("/api/transactions/import")
      .set(auth(user.token))
      .send({ rows: [{ type: "income", category: "Salary", amount: 700 }] });

    expect(res.body.data.imported).toBe(1);
    expect(await balanceOf(user, cash._id)).toBe(700);
    expect(await Transaction.countDocuments({ userId: user.user._id, walletId: cash._id })).toBe(1);
  });

  it("what a recurring rule creates goes to the default wallet", async () => {
    const user = await newUser();
    const cash = await cashOf(user);
    const rule = await api()
      .post("/api/recurring")
      .set(auth(user.token))
      .send({ categoryId: user.salary._id, amount: 900, frequency: "monthly", startDate: "2024-01-01", endDate: "2024-01-31" });
    expect(rule.status).toBe(201);

    await api().get("/api/transactions").set(auth(user.token));
    expect(await balanceOf(user, cash._id)).toBe(900);
  });
});

// Older documents are written straight to the collection, the way they are on Atlas: without the field at all.
describe("transactions saved before wallets existed", () => {
  async function insertOld(user, overrides = {}) {
    const { insertedId } = await Transaction.collection.insertOne({
      userId: new Transaction.base.Types.ObjectId(user.user._id),
      categoryId: new Transaction.base.Types.ObjectId(user.food._id),
      type: "expense",
      amount: 400,
      currency: "VND",
      note: "old",
      date: new Date(),
      tags: [],
      ...overrides,
    });
    return insertedId;
  }

  it("count in the Cash wallet, and the documents are not changed", async () => {
    const user = await newUser();
    const id = await insertOld(user);
    const cash = await cashOf(user);

    expect(await balanceOf(user, cash._id)).toBe(-400);
    const raw = await Transaction.collection.findOne({ _id: id });
    expect(raw).not.toHaveProperty("walletId");
  });

  it("show the Cash wallet in the answers and are found by its filter, not by another wallet's", async () => {
    const user = await newUser();
    const id = await insertOld(user);
    const cash = await cashOf(user);
    const bank = await createWallet(user);

    const one = await api().get(`/api/transactions/${id}`).set(auth(user.token));
    expect(one.body.data.wallet).toMatchObject({ _id: cash._id, name: "Cash" });
    expect(one.body.data.category.name).toBe("Food");

    const all = await api().get("/api/transactions").set(auth(user.token));
    expect(all.body.data[0].wallet.name).toBe("Cash");

    const inCash = await api().get(`/api/transactions?walletId=${cash._id}`).set(auth(user.token));
    expect(inCash.body.data.map((t) => t.note)).toEqual(["old"]);

    const inBank = await api().get(`/api/transactions?walletId=${bank._id}`).set(auth(user.token));
    expect(inBank.body.data).toEqual([]);
  });

  it("can be edited, and stay without a wallet until one is chosen", async () => {
    const user = await newUser();
    const id = await insertOld(user);
    const bank = await createWallet(user, { initialBalance: 1000 });

    const edited = await api().patch(`/api/transactions/${id}`).set(auth(user.token)).send({ note: "edited" });
    expect(edited.status).toBe(200);
    expect(edited.body.data.wallet.name).toBe("Cash");
    expect(await Transaction.collection.findOne({ _id: id })).not.toHaveProperty("walletId");

    const moved = await api().patch(`/api/transactions/${id}`).set(auth(user.token)).send({ walletId: bank._id });
    expect(moved.body.data.wallet.name).toBe(bank.name);
    expect(await balanceOf(user, bank._id)).toBe(600);
  });
});

describe("the account and wallets", () => {
  let user;

  beforeAll(async () => {
    user = await newUser();
    const bank = await createWallet(user);
    const cash = await cashOf(user);
    await api().post("/api/transfers").set(auth(user.token)).send({ fromWalletId: bank._id, toWalletId: cash._id, amount: 5 });
  });

  it("the data export has the wallets and the transfers", async () => {
    const res = await api().get("/api/users/me/export").set(auth(user.token));
    expect(res.body.data.wallets.map((w) => w.name)).toEqual(["Cash", NEW_WALLET.name]);
    expect(res.body.data.transfers[0]).toMatchObject({ amount: 5, from: { name: NEW_WALLET.name }, to: { name: "Cash" } });
  });

  it("deleting the account deletes them", async () => {
    const res = await api().delete("/api/users/me").set(auth(user.token)).send({ password: user.password });
    expect(res.status).toBe(200);
    expect(await Wallet.countDocuments({ userId: user.user._id })).toBe(0);
    expect(await Transfer.countDocuments({ userId: user.user._id })).toBe(0);
  });
});
