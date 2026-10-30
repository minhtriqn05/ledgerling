import { httpError } from "../utils/httpError.js";
import { isValidDay, todayInVietnam } from "../utils/month.js";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
// The amount boxes of the client hold 12 digits, so this is the biggest number they can send
const MAX_AMOUNT = 999_999_999_999;

// Anything that is not a string counts as empty
function text(value) {
  return typeof value === "string" ? value : "";
}

// Each helper checks one field and returns the cleaned value, or throws a 400.
function checkName(value) {
  const name = text(value).trim();
  if (!name) throw httpError(400, "Name is required");
  if (name.length > 60) throw httpError(400, "Name must be at most 60 characters");
  return name;
}

// Whole VND only: no decimals means $inc adds up exactly, however many requests arrive at the same time
function isWholeAmount(value) {
  return Number.isSafeInteger(value) && Math.abs(value) <= MAX_AMOUNT;
}

function checkTargetAmount(value) {
  if (!isWholeAmount(value) || value <= 0) {
    throw httpError(400, "Target amount must be a whole number greater than 0");
  }
  return value;
}

function checkColor(value) {
  const color = text(value).trim();
  if (!COLOR_REGEX.test(color)) throw httpError(400, "Color must be a hex code like #FF7043");
  return color;
}

function checkDay(value, field) {
  if (typeof value !== "string" || !isValidDay(value)) {
    throw httpError(400, `${field} must be a date in YYYY-MM-DD format`);
  }
  return value;
}

// No deadline (left out, null or an empty form field) means the goal has none.
// mustBeFuture is true only when a goal is created, so a goal whose deadline has passed can still be edited.
function checkDeadline(value, mustBeFuture) {
  if (value === undefined || value === null || value === "") return null;
  const deadline = checkDay(value, "Deadline");
  // Same format, so comparing the strings compares the days
  if (mustBeFuture && deadline <= todayInVietnam()) throw httpError(400, "Deadline must be after today");
  return deadline;
}

// On success, req.body is replaced by only the fields we expect, cleaned.
// userId and savedAmount are never read from the body: the owner comes from the token,
// and savedAmount changes only through the contribution routes.
function goalFields(body, mustBeFuture) {
  return {
    name: checkName(body.name),
    targetAmount: checkTargetAmount(body.targetAmount),
    deadline: checkDeadline(body.deadline, mustBeFuture),
    color: checkColor(body.color),
  };
}

export function validateGoalCreate(req, res, next) {
  req.body = goalFields(req.body ?? {}, true);
  next();
}

// PUT replaces the whole goal (name, target, deadline, color)
export function validateGoalUpdate(req, res, next) {
  req.body = goalFields(req.body ?? {}, false);
  next();
}

export function validateContribution(req, res, next) {
  const body = req.body ?? {};

  if (!isWholeAmount(body.amount) || body.amount === 0) {
    throw httpError(400, "Amount must be a whole number other than 0");
  }

  let note = "";
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== "string") throw httpError(400, "Note must be a string");
    note = body.note.trim();
    if (note.length > 200) throw httpError(400, "Note must be at most 200 characters");
  }

  // A missing date means today; the service fills it in
  const hasDate = body.date !== undefined && body.date !== null && body.date !== "";
  req.body = { amount: body.amount, note, date: hasDate ? checkDay(body.date, "Date") : null };
  next();
}

// A malformed id can never match anything, so answer 404 instead of letting Mongoose throw a CastError.
export function validateGoalId(req, res, next) {
  if (!OBJECT_ID_REGEX.test(req.params.id)) throw httpError(404, "Goal not found");
  next();
}

export function validateContributionId(req, res, next) {
  if (!OBJECT_ID_REGEX.test(req.params.contributionId)) throw httpError(404, "Contribution not found");
  next();
}
