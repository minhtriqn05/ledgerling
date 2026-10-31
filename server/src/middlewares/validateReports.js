import { httpError } from "../utils/httpError.js";
import { MONTH_REGEX } from "../utils/month.js";
import { CURRENCY_REGEX } from "./validateStats.js";

const YEAR_REGEX = /^\d{4}$/;
const MIN_YEAR = 1970;
const MAX_YEAR = 2100;

function checkCurrency(currency) {
  if (currency !== undefined && !CURRENCY_REGEX.test(currency)) {
    throw httpError(400, "Currency must be a 3-letter ISO code", "CURRENCY_INVALID");
  }
}

// The optional ?month= and ?currency= of GET /reports/monthly and GET /insights
export function validateMonthQuery(req, res, next) {
  const { month, currency } = req.query;
  if (month !== undefined && !MONTH_REGEX.test(month)) {
    throw httpError(400, "Month must be in YYYY-MM format", "MONTH_INVALID");
  }
  checkCurrency(currency);
  next();
}

// The optional ?year= and ?currency= of GET /reports/yearly
export function validateYearQuery(req, res, next) {
  const { year, currency } = req.query;
  if (year !== undefined && (!YEAR_REGEX.test(year) || year < MIN_YEAR || year > MAX_YEAR)) {
    throw httpError(400, `Year must be a 4-digit year from ${MIN_YEAR} to ${MAX_YEAR}`);
  }
  checkCurrency(currency);
  next();
}
