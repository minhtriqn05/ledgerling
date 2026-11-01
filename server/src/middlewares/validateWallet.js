import { httpError } from "../utils/httpError.js";

const TYPES = ["cash", "bank", "ewallet"];
const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}/;
const WHOLE_NUMBER_REGEX = /^\d+$/;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Anything that is not a string counts as empty
function text(value) {
  return typeof value === "string" ? value : "";
}

// Each helper checks one field and returns the cleaned value, or throws a 400.
function checkName(value) {
  const name = text(value).trim();
  if (!name) throw httpError(400, "Name is required", "NAME_REQUIRED");
  if (name.length > 30) throw httpError(400, "Name must be at most 30 characters", "NAME_TOO_LONG");
  return name;
}

function checkType(value) {
  if (!TYPES.includes(value)) throw httpError(400, `Type must be one of ${TYPES.join(", ")}`, "WALLET_TYPE_INVALID");
  return value;
}

function checkColor(value) {
  const color = text(value).trim();
  if (!COLOR_REGEX.test(color)) throw httpError(400, "Color must be a hex code like #FF7043", "COLOR_INVALID");
  return color;
}

function checkInitialBalance(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw httpError(400, "Initial balance must be 0 or more", "WALLET_BALANCE_INVALID");
  }
  return value;
}

function checkWalletId(value, field) {
  const id = text(value).trim();
  if (!OBJECT_ID_REGEX.test(id)) throw httpError(400, `${field} is invalid`);
  return id;
}

// On success, req.body is replaced by only the fields we expect, cleaned.
// userId and isDefault are never read from the body.
export function validateCreateWallet(req, res, next) {
  const body = req.body ?? {};
  const data = { name: checkName(body.name), type: checkType(body.type), color: checkColor(body.color) };
  if (body.initialBalance !== undefined) data.initialBalance = checkInitialBalance(body.initialBalance);

  req.body = data;
  next();
}

export function validateUpdateWallet(req, res, next) {
  const body = req.body ?? {};
  const changes = {};

  if (body.name !== undefined) changes.name = checkName(body.name);
  if (body.type !== undefined) changes.type = checkType(body.type);
  if (body.color !== undefined) changes.color = checkColor(body.color);
  if (body.initialBalance !== undefined) changes.initialBalance = checkInitialBalance(body.initialBalance);
  if (body.archived !== undefined) {
    if (typeof body.archived !== "boolean") throw httpError(400, "Archived must be true or false");
    changes.archived = body.archived;
  }

  if (Object.keys(changes).length === 0) throw httpError(400, "Nothing to update");

  req.body = changes;
  next();
}

// A malformed id can never match anything, so answer 404 instead of letting Mongoose throw a CastError.
export function validateWalletId(req, res, next) {
  if (!OBJECT_ID_REGEX.test(req.params.id)) throw httpError(404, "Wallet not found", "WALLET_NOT_FOUND");
  next();
}

// ----- Transfers -----

export function validateCreateTransfer(req, res, next) {
  const body = req.body ?? {};
  const data = {
    fromWalletId: checkWalletId(body.fromWalletId, "From wallet id"),
    toWalletId: checkWalletId(body.toWalletId, "To wallet id"),
  };
  if (data.fromWalletId.toLowerCase() === data.toWalletId.toLowerCase()) {
    throw httpError(400, "Choose two different wallets", "TRANSFER_SAME_WALLET");
  }

  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
    throw httpError(400, "Amount must be greater than 0", "AMOUNT_INVALID");
  }
  data.amount = body.amount;

  // Optional fields: when left out, the model defaults apply (empty note, now)
  if (body.note !== undefined) {
    if (typeof body.note !== "string") throw httpError(400, "Note must be a string");
    data.note = body.note.trim();
    if (data.note.length > 200) throw httpError(400, "Note must be at most 200 characters", "NOTE_TOO_LONG");
  }
  if (body.date !== undefined) {
    // Must start like an ISO 8601 date (YYYY-MM-DD...), because new Date() alone accepts things like "1"
    const date = typeof body.date === "string" && ISO_DATE_REGEX.test(body.date) ? new Date(body.date) : null;
    if (!date || Number.isNaN(date.getTime())) {
      throw httpError(400, "Date is invalid, use ISO 8601 like 2026-10-27T12:30:00+07:00", "DATE_INVALID");
    }
    data.date = date;
  }

  req.body = data;
  next();
}

// A query value is a string, or an array when the same key is sent twice, which we refuse.
// On success the cleaned values, with their defaults, are put in req.listQuery (Express 5 does not let us replace req.query).
export function validateListTransfers(req, res, next) {
  const { walletId, page, limit } = req.query;
  const listQuery = { page: 1, limit: DEFAULT_LIMIT };

  if (walletId !== undefined) listQuery.walletId = checkWalletId(walletId, "Wallet id");
  if (page !== undefined) {
    listQuery.page = typeof page === "string" && WHOLE_NUMBER_REGEX.test(page) ? Number(page) : 0;
    if (listQuery.page < 1) throw httpError(400, "Page must be a whole number from 1");
  }
  if (limit !== undefined) {
    listQuery.limit = typeof limit === "string" && WHOLE_NUMBER_REGEX.test(limit) ? Number(limit) : 0;
    if (listQuery.limit < 1 || listQuery.limit > MAX_LIMIT) {
      throw httpError(400, `Limit must be a whole number from 1 to ${MAX_LIMIT}`);
    }
  }

  req.listQuery = listQuery;
  next();
}

export function validateTransferId(req, res, next) {
  if (!OBJECT_ID_REGEX.test(req.params.id)) throw httpError(404, "Transfer not found", "TRANSFER_NOT_FOUND");
  next();
}
