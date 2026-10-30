import { httpError } from "../utils/httpError.js";
import { MONTH_REGEX, isValidDay } from "../utils/month.js";

const TYPES = ["income", "expense"];
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}/;

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
  if (typeof value !== "string") throw httpError(400, "Note must be a string");
  const note = value.trim();
  if (note.length > 200) throw httpError(400, "Note must be at most 200 characters");
  return note;
}

// Must start like an ISO 8601 date (YYYY-MM-DD...), because new Date() alone accepts things like "1"
function checkDate(value) {
  const date = typeof value === "string" && ISO_DATE_REGEX.test(value) ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw httpError(400, "Date is invalid, use ISO 8601 like 2026-10-27T12:30:00+07:00");
  }
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

// ----- GET /transactions query -----
// A query value is a string, or an array when the same key is sent twice (?q=a&q=b), which we refuse.

const SORTS = ["date", "-date", "amount", "-amount"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const WHOLE_NUMBER_REGEX = /^\d+$/;

function checkDay(value, field) {
  if (typeof value !== "string" || !isValidDay(value)) {
    throw httpError(400, `${field} must be a date in YYYY-MM-DD format`);
  }
  return value;
}

function checkSearch(value) {
  if (typeof value !== "string") throw httpError(400, "Search must be a string");
  const q = value.trim();
  if (q.length > 100) throw httpError(400, "Search must be at most 100 characters");
  return q;
}

function checkPage(value) {
  const page = typeof value === "string" && WHOLE_NUMBER_REGEX.test(value) ? Number(value) : 0;
  if (page < 1) throw httpError(400, "Page must be a whole number from 1");
  return page;
}

function checkLimit(value) {
  const limit = typeof value === "string" && WHOLE_NUMBER_REGEX.test(value) ? Number(value) : 0;
  if (limit < 1 || limit > MAX_LIMIT) {
    throw httpError(400, `Limit must be a whole number from 1 to ${MAX_LIMIT}`);
  }
  return limit;
}

// Checks the filters that GET /transactions and GET /transactions/export share (everything but page and limit)
// and returns them cleaned, with the sort default.
function readFilters(query) {
  const { month, from, to, type, categoryId, q, sort } = query;

  if (month !== undefined && (from !== undefined || to !== undefined)) {
    throw httpError(400, "Use either month or from/to, not both");
  }
  if (month !== undefined && !MONTH_REGEX.test(month)) {
    throw httpError(400, "Month must be in YYYY-MM format");
  }
  if (type !== undefined && !TYPES.includes(type)) {
    throw httpError(400, "Type must be income or expense");
  }
  if (categoryId !== undefined && !OBJECT_ID_REGEX.test(categoryId)) {
    throw httpError(400, "Category id is invalid");
  }
  if (sort !== undefined && !SORTS.includes(sort)) {
    throw httpError(400, `Sort must be one of ${SORTS.join(", ")}`);
  }

  const listQuery = { sort: sort ?? "-date" };
  if (month !== undefined) listQuery.month = month;
  if (from !== undefined) listQuery.from = checkDay(from, "From");
  if (to !== undefined) listQuery.to = checkDay(to, "To");
  // Same format, so comparing the strings compares the days
  if (listQuery.from && listQuery.to && listQuery.from > listQuery.to) {
    throw httpError(400, "From must be before or equal to to");
  }
  if (type !== undefined) listQuery.type = type;
  if (categoryId !== undefined) listQuery.categoryId = categoryId;
  // An empty search (?q= or only spaces) is ignored
  if (q !== undefined) {
    const search = checkSearch(q);
    if (search) listQuery.q = search;
  }

  return listQuery;
}

// Every filter is optional. On success the cleaned values, with their defaults, are put in req.listQuery
// (Express 5 does not let us replace req.query).
export function validateListTransactions(req, res, next) {
  const { page, limit } = req.query;
  const listQuery = readFilters(req.query);
  listQuery.page = page === undefined ? 1 : checkPage(page);
  listQuery.limit = limit === undefined ? DEFAULT_LIMIT : checkLimit(limit);

  req.listQuery = listQuery;
  next();
}

// The export takes the same filters, but page and limit are ignored (even if they are invalid): it is not paged.
export function validateExportTransactions(req, res, next) {
  req.listQuery = readFilters(req.query);
  next();
}
