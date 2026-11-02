import { httpError } from "../utils/httpError.js";
import { MONTH_REGEX } from "../utils/month.js";
import { checkAmount, checkId, text, validIdParam } from "../utils/validation.js";

// Each helper checks one field and returns the cleaned value, or throws a 400.
const checkCategoryId = (value) => checkId(value, "Category id is invalid");

function checkMonth(value, label = "Month") {
  const month = text(value).trim();
  if (!MONTH_REGEX.test(month)) throw httpError(400, `${label} must be in YYYY-MM format`, "MONTH_INVALID");
  return month;
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

export const validateBudgetId = validIdParam("id", "Budget not found", "BUDGET_NOT_FOUND");

// The optional ?month= filter. Only checked when it is present.
export function validateListBudgets(req, res, next) {
  const { month } = req.query;
  if (month !== undefined && (typeof month !== "string" || !MONTH_REGEX.test(month))) {
    throw httpError(400, "Month must be in YYYY-MM format", "MONTH_INVALID");
  }
  next();
}
