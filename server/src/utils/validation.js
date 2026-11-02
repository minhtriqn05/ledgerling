import { httpError } from "./httpError.js";
import { isValidDay } from "./month.js";

// The checks that the request validators (middlewares/validate*.js) share. Each helper checks one value and returns
// it cleaned, or throws a 400 that errorHandler sends as { success: false, message, code }.

export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
export const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const WHOLE_NUMBER_REGEX = /^\d+$/;
// Must start like an ISO 8601 date (YYYY-MM-DD...), because new Date() alone accepts things like "1"
const ISO_DATE_REGEX = /^(\d{4}-\d{2}-\d{2})/;

// Money is whole VND. The amount boxes of the client hold 12 digits, so this is the biggest amount it can send.
// Whole numbers this size add up exactly (far below Number.MAX_SAFE_INTEGER), so totals never have rounding errors.
export const MAX_AMOUNT = 999_999_999_999;
// The years the app works with (the yearly report accepts the same range)
export const MIN_YEAR = 1970;
export const MAX_YEAR = 2100;
// A page number bigger than this would only skip past every document there is
export const MAX_PAGE = 100_000;

// Anything that is not a string counts as empty
export function text(value) {
  return typeof value === "string" ? value : "";
}

export function isObjectId(value) {
  return typeof value === "string" && OBJECT_ID_REGEX.test(value);
}

// An id sent in a body or a query (trimmed), or a 400 with this message
export function checkId(value, message) {
  const id = text(value).trim();
  if (!OBJECT_ID_REGEX.test(id)) throw httpError(400, message);
  return id;
}

// A malformed id in the address can never match anything: answer 404 (as for an id of another user)
// instead of letting Mongoose throw a CastError. validIdParam("id", "Goal not found", "GOAL_NOT_FOUND")
export function validIdParam(name, message, code) {
  return (req, res, next) => {
    if (!isObjectId(req.params[name])) throw httpError(404, message, code);
    next();
  };
}

export function isWholeAmount(value) {
  return Number.isSafeInteger(value) && Math.abs(value) <= MAX_AMOUNT;
}

// A JSON number of whole VND, from 1 to MAX_AMOUNT (a string like "45000" is refused)
export function checkAmount(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw httpError(400, "Amount must be greater than 0", "AMOUNT_INVALID");
  }
  if (!Number.isInteger(value)) throw httpError(400, "Amount must be a whole number of VND", "AMOUNT_INVALID");
  if (value > MAX_AMOUNT) throw httpError(400, "Amount must be at most 999,999,999,999", "AMOUNT_INVALID");
  return value;
}

export function checkName(value, maxLength) {
  const name = text(value).trim();
  if (!name) throw httpError(400, "Name is required", "NAME_REQUIRED");
  if (name.length > maxLength) throw httpError(400, `Name must be at most ${maxLength} characters`, "NAME_TOO_LONG");
  return name;
}

export function checkNote(value) {
  if (typeof value !== "string") throw httpError(400, "Note must be a string");
  const note = value.trim();
  if (note.length > 200) throw httpError(400, "Note must be at most 200 characters", "NOTE_TOO_LONG");
  return note;
}

export function checkColor(value) {
  const color = text(value).trim();
  if (!COLOR_REGEX.test(color)) throw httpError(400, "Color must be a hex code like #FF7043", "COLOR_INVALID");
  return color;
}

// A calendar day "YYYY-MM-DD" that exists ("2026-02-30" does not) and lies in MIN_YEAR..MAX_YEAR
export function isAppDay(day) {
  if (typeof day !== "string" || !isValidDay(day)) return false;
  const year = Number(day.slice(0, 4));
  return year >= MIN_YEAR && year <= MAX_YEAR;
}

export function checkDay(value, field) {
  if (!isAppDay(value)) throw httpError(400, `${field} must be a date in YYYY-MM-DD format`, "DATE_INVALID");
  return value;
}

// A moment written in ISO 8601, like 2026-10-27T12:30:00+07:00. Its day must exist: new Date() would quietly
// turn "2026-02-30T10:00:00Z" into March 2nd.
export function checkIsoDate(value) {
  const day = typeof value === "string" ? ISO_DATE_REGEX.exec(value)?.[1] : null;
  const date = isAppDay(day) ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw httpError(400, "Date is invalid, use ISO 8601 like 2026-10-27T12:30:00+07:00", "DATE_INVALID");
  }
  return date;
}

// ?page= of a paginated list: a whole number from 1 (1 when it is left out)
export function readPage(value) {
  if (value === undefined) return 1;
  const page = typeof value === "string" && WHOLE_NUMBER_REGEX.test(value) ? Number(value) : 0;
  if (page < 1) throw httpError(400, "Page must be a whole number from 1");
  if (page > MAX_PAGE) throw httpError(400, `Page must be at most ${MAX_PAGE}`);
  return page;
}

// ?limit= of a paginated list: a whole number from 1 to max (defaultLimit when it is left out)
export function readLimit(value, defaultLimit, max) {
  if (value === undefined) return defaultLimit;
  const limit = typeof value === "string" && WHOLE_NUMBER_REGEX.test(value) ? Number(value) : 0;
  if (limit < 1 || limit > max) throw httpError(400, `Limit must be a whole number from 1 to ${max}`);
  return limit;
}
