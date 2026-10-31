import { httpError } from "../utils/httpError.js";
import { isValidDay } from "../utils/month.js";

const FREQUENCIES = ["weekly", "monthly"];
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

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
    throw httpError(400, "Amount must be greater than 0", "AMOUNT_INVALID");
  }
  return value;
}

function checkNote(value) {
  if (value === undefined) return "";
  if (typeof value !== "string") throw httpError(400, "Note must be a string");
  const note = value.trim();
  if (note.length > 200) throw httpError(400, "Note must be at most 200 characters", "NOTE_TOO_LONG");
  return note;
}

function checkFrequency(value) {
  if (!FREQUENCIES.includes(value)) throw httpError(400, "Frequency must be weekly or monthly");
  return value;
}

function checkDay(value, field) {
  if (typeof value !== "string" || !isValidDay(value)) {
    throw httpError(400, `${field} must be a date in YYYY-MM-DD format`, "DATE_INVALID");
  }
  return value;
}

// POST and PUT take the same body: PUT replaces the whole rule.
// On success, req.body is replaced by only the fields we expect, cleaned.
// userId is never read from the body: the controller uses the user from the token.
export function validateRecurringRule(req, res, next) {
  const body = req.body ?? {};

  const startDate = checkDay(body.startDate, "Start date");
  // No end date (left out, null or an empty form field) means the rule never ends
  const hasEnd = body.endDate !== undefined && body.endDate !== null && body.endDate !== "";
  const endDate = hasEnd ? checkDay(body.endDate, "End date") : null;
  // Same format, so comparing the strings compares the days
  if (endDate && endDate <= startDate) throw httpError(400, "End date must be after the start date", "END_BEFORE_START");

  req.body = {
    categoryId: checkCategoryId(body.categoryId),
    amount: checkAmount(body.amount),
    note: checkNote(body.note),
    frequency: checkFrequency(body.frequency),
    startDate,
    endDate,
  };
  next();
}

// A malformed id can never match anything, so answer 404 instead of letting Mongoose throw a CastError.
export function validateRecurringId(req, res, next) {
  if (!OBJECT_ID_REGEX.test(req.params.id)) throw httpError(404, "Recurring rule not found", "RULE_NOT_FOUND");
  next();
}
