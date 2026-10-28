import { httpError } from "../utils/httpError.js";
import { MONTH_REGEX } from "../utils/month.js";

const TYPES = ["income", "expense"];
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;

// Anything that is not a string counts as empty
function text(value) {
  return typeof value === "string" ? value : "";
}

// Each helper checks one field and returns the cleaned value, or throws a 400.
function checkCategoryId(value) {
  const categoryId = text(value).trim();
  if (!OBJECT_ID_REGEX.test(categoryId)) throw httpError(400, "Category id is invalid");
  return categoryId;
}

function checkAmount(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw httpError(400, "Amount must be greater than 0");
  }
  return value;
}

function checkCurrency(value) {
  const currency = text(value).trim().toUpperCase();
  if (!CURRENCY_REGEX.test(currency)) throw httpError(400, "Currency must be a 3-letter ISO code");
  return currency;
}

function checkNote(value) {
  const note = text(value).trim();
  if (note.length > 200) throw httpError(400, "Note must be at most 200 characters");
  return note;
}

function checkDate(value) {
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) throw httpError(400, "Date is invalid");
  return date;
}

// On success, req.body is replaced by only the fields we expect, cleaned.
// userId and type are never read from the body: userId comes from the token, type from the category.
export function validateCreateTransaction(req, res, next) {
  const body = req.body ?? {};

  const data = {
    categoryId: checkCategoryId(body.categoryId),
    amount: checkAmount(body.amount),
  };
  // Optional fields: when left out, the model defaults apply (VND, empty note, now)
  if (body.currency !== undefined) data.currency = checkCurrency(body.currency);
  if (body.note !== undefined) data.note = checkNote(body.note);
  if (body.date !== undefined) data.date = checkDate(body.date);

  req.body = data;
  next();
}

export function validateUpdateTransaction(req, res, next) {
  const body = req.body ?? {};
  const changes = {};

  if (body.categoryId !== undefined) changes.categoryId = checkCategoryId(body.categoryId);
  if (body.amount !== undefined) changes.amount = checkAmount(body.amount);
  if (body.currency !== undefined) changes.currency = checkCurrency(body.currency);
  if (body.note !== undefined) changes.note = checkNote(body.note);
  if (body.date !== undefined) changes.date = checkDate(body.date);

  if (Object.keys(changes).length === 0) throw httpError(400, "Nothing to update");

  req.body = changes;
  next();
}

// A malformed id can never match anything, so answer 404 instead of letting Mongoose throw a CastError.
export function validateTransactionId(req, res, next) {
  if (!OBJECT_ID_REGEX.test(req.params.id)) throw httpError(404, "Transaction not found");
  next();
}

// The optional ?month=, ?type= and ?categoryId= filters. Only checked when present.
export function validateListTransactions(req, res, next) {
  const { month, type, categoryId } = req.query;

  if (month !== undefined && !MONTH_REGEX.test(month)) {
    throw httpError(400, "Month must be in YYYY-MM format");
  }
  if (type !== undefined && !TYPES.includes(type)) {
    throw httpError(400, "Type must be income or expense");
  }
  if (categoryId !== undefined && !OBJECT_ID_REGEX.test(categoryId)) {
    throw httpError(400, "Category id is invalid");
  }
  next();
}
