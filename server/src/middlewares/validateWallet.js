import { httpError } from "../utils/httpError.js";
import {
  MAX_AMOUNT,
  checkAmount,
  checkColor,
  checkId,
  checkIsoDate,
  checkName,
  checkNote,
  readLimit,
  readPage,
  validIdParam,
} from "../utils/validation.js";

const TYPES = ["cash", "bank", "ewallet"];
const NAME_MAX = 30;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Each helper checks one field and returns the cleaned value, or throws a 400.
function checkType(value) {
  if (!TYPES.includes(value)) throw httpError(400, `Type must be one of ${TYPES.join(", ")}`, "WALLET_TYPE_INVALID");
  return value;
}

// Whole VND from 0, like every other amount
function checkInitialBalance(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_AMOUNT) {
    throw httpError(400, "Initial balance must be a whole number of VND, 0 or more", "WALLET_BALANCE_INVALID");
  }
  return value;
}

// On success, req.body is replaced by only the fields we expect, cleaned.
// userId and isDefault are never read from the body.
export function validateCreateWallet(req, res, next) {
  const body = req.body ?? {};
  const data = { name: checkName(body.name, NAME_MAX), type: checkType(body.type), color: checkColor(body.color) };
  if (body.initialBalance !== undefined) data.initialBalance = checkInitialBalance(body.initialBalance);

  req.body = data;
  next();
}

export function validateUpdateWallet(req, res, next) {
  const body = req.body ?? {};
  const changes = {};

  if (body.name !== undefined) changes.name = checkName(body.name, NAME_MAX);
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

export const validateWalletId = validIdParam("id", "Wallet not found", "WALLET_NOT_FOUND");

// ----- Transfers -----

export function validateCreateTransfer(req, res, next) {
  const body = req.body ?? {};
  const data = {
    fromWalletId: checkId(body.fromWalletId, "From wallet id is invalid"),
    toWalletId: checkId(body.toWalletId, "To wallet id is invalid"),
  };
  if (data.fromWalletId.toLowerCase() === data.toWalletId.toLowerCase()) {
    throw httpError(400, "Choose two different wallets", "TRANSFER_SAME_WALLET");
  }
  data.amount = checkAmount(body.amount);

  // Optional fields: when left out, the model defaults apply (empty note, now)
  if (body.note !== undefined) data.note = checkNote(body.note);
  if (body.date !== undefined) data.date = checkIsoDate(body.date);

  req.body = data;
  next();
}

// A query value is a string, or an array when the same key is sent twice, which we refuse.
// On success the cleaned values, with their defaults, are put in req.listQuery (Express 5 does not let us replace req.query).
export function validateListTransfers(req, res, next) {
  const { walletId, page, limit } = req.query;
  const listQuery = { page: readPage(page), limit: readLimit(limit, DEFAULT_LIMIT, MAX_LIMIT) };
  if (walletId !== undefined) listQuery.walletId = checkId(walletId, "Wallet id is invalid");

  req.listQuery = listQuery;
  next();
}

export const validateTransferId = validIdParam("id", "Transfer not found", "TRANSFER_NOT_FOUND");
