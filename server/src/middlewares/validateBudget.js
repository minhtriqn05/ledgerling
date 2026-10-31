import { httpError } from "../utils/httpError.js";
import { MONTH_REGEX } from "../utils/month.js";

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

function checkMonth(value, label = "Month") {
  const month = text(value).trim();
  if (!MONTH_REGEX.test(month)) throw httpError(400, `${label} must be in YYYY-MM format`, "MONTH_INVALID");
  return month;
}

function checkAmount(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw httpError(400, "Amount must be greater than 0", "AMOUNT_INVALID");
  }
  return value;
}

// On success, req.body is replaced by only the fields we expect, cleaned.
// userId is never read from the body: the controller uses the user from the token.
export function validateCreateBudget(req, res, next) {
  const body = req.body ?? {};

  req.body = {
    categoryId: checkCategoryId(body.categoryId),
    month: checkMonth(body.month),
    amount: checkAmount(body.amount),
  };
  next();
}

export function validateCopyBudgets(req, res, next) {
  const body = req.body ?? {};

  const fromMonth = checkMonth(body.fromMonth, "From month");
  const toMonth = checkMonth(body.toMonth, "To month");
  if (fromMonth === toMonth) throw httpError(400, "From month and to month must be different");

  req.body = { fromMonth, toMonth };
  next();
}

// Only the amount can change. A budget for another category or month is a new budget.
export function validateUpdateBudget(req, res, next) {
  const body = req.body ?? {};

  if (body.categoryId !== undefined || body.month !== undefined) {
    throw httpError(400, "Only the amount can be changed");
  }
  if (body.amount === undefined) throw httpError(400, "Nothing to update");

  req.body = { amount: checkAmount(body.amount) };
  next();
}

// A malformed id can never match anything, so answer 404 instead of letting Mongoose throw a CastError.
export function validateBudgetId(req, res, next) {
  if (!OBJECT_ID_REGEX.test(req.params.id)) throw httpError(404, "Budget not found", "BUDGET_NOT_FOUND");
  next();
}

// The optional ?month= filter. Only checked when it is present.
export function validateListBudgets(req, res, next) {
  const { month } = req.query;
  if (month !== undefined && !MONTH_REGEX.test(month)) {
    throw httpError(400, "Month must be in YYYY-MM format", "MONTH_INVALID");
  }
  next();
}
