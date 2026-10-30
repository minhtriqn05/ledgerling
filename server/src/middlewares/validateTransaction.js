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

// ----- Tags -----
const TAG_REGEX = /^[a-z0-9-]{1,20}$/;
const MAX_TAGS = 5;
const TAG_MESSAGE = "Each tag must be 1-20 letters, digits or hyphens";

// One tag, lower-cased. Used for ?tag= and for every item of a tags array.
function checkTag(value) {
  const tag = text(value).trim().toLowerCase();
  if (!TAG_REGEX.test(tag)) throw httpError(400, TAG_MESSAGE);
  return tag;
}

// An array of tags: trimmed, lower-cased, duplicates removed. [] clears the tags of a transaction.
function checkTags(value) {
  if (!Array.isArray(value)) throw httpError(400, "Tags must be an array");
  const tags = [...new Set(value.map(checkTag))];
  if (tags.length > MAX_TAGS) throw httpError(400, `A transaction can have at most ${MAX_TAGS} tags`);
  return tags;
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
  if (body.tags !== undefined) data.tags = checkTags(body.tags);

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
  if (body.tags !== undefined) changes.tags = checkTags(body.tags);

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
  const { month, from, to, type, categoryId, q, sort, tag } = query;

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
  if (tag !== undefined) listQuery.tag = checkTag(tag);
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

// ----- POST /transactions/import -----

export const MAX_IMPORT_ROWS = 500;
// The date format of the export ("2026-10-27 12:30", Vietnam time) or just a day
const IMPORT_DATE_REGEX = /^(\d{4}-\d{2}-\d{2})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?$/;

// An empty CSV cell arrives as "" (or null): it counts as a missing value, so the default applies
function isBlank(value) {
  return value === undefined || value === null || value === "";
}

function checkImportDate(value) {
  const trimmed = typeof value === "string" ? value.trim() : value;
  const match = typeof trimmed === "string" ? IMPORT_DATE_REGEX.exec(trimmed) : null;
  // Not the export format: it must be a full ISO 8601 date, like when creating one
  if (!match) return checkDate(trimmed);

  const [, day, hour = "00", minute = "00", second = "00"] = match;
  if (!isValidDay(day) || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) {
    throw httpError(400, "Date is invalid, use YYYY-MM-DD HH:mm or ISO 8601");
  }
  return new Date(`${day}T${hour}:${minute}:${second}+07:00`);
}

// Checks one row of the CSV like a new transaction is checked. The category is given by its name and type
// (the service looks it up); the result is the cleaned row, or a 400 error that names the first problem.
function cleanImportRow(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw httpError(400, "Row must be an object");
  }

  const type = text(raw.type).trim().toLowerCase();
  if (!TYPES.includes(type)) throw httpError(400, "Type must be income or expense");
  const categoryName = text(raw.category).trim();
  if (!categoryName) throw httpError(400, "Category is required");

  const row = { type, categoryName, amount: checkAmount(raw.amount) };
  if (!isBlank(raw.date)) row.date = checkImportDate(raw.date);
  if (!isBlank(raw.currency)) row.currency = checkCurrency(raw.currency);
  if (!isBlank(raw.note)) row.note = checkNote(raw.note);
  if (!isBlank(raw.tags)) row.tags = checkTags(raw.tags);
  return row;
}

// The body is { rows: [...] }, 1 to 500 rows. A bad row does not fail the request: it is listed in
// req.importErrors (row = its position, 1 is the first row) and the good rows are in req.importRows.
export function validateImportTransactions(req, res, next) {
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) throw httpError(400, "Rows must be a non-empty array");
  if (rows.length > MAX_IMPORT_ROWS) {
    throw httpError(400, `You can import at most ${MAX_IMPORT_ROWS} rows at a time`);
  }

  req.importRows = [];
  req.importErrors = [];
  rows.forEach((raw, index) => {
    const row = index + 1;
    try {
      req.importRows.push({ row, ...cleanImportRow(raw) });
    } catch (err) {
      if (!err.status) throw err; // a bug, not a bad row
      req.importErrors.push({ row, message: err.message });
    }
  });
  next();
}
