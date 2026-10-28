import { httpError } from "../utils/httpError.js";
import { MONTH_REGEX } from "../utils/month.js";

// ISO 4217 code in upper case, like VND or USD ("usd" is refused, the query is not upper-cased)
const CURRENCY_REGEX = /^[A-Z]{3}$/;

// The optional ?month= and ?currency= of the summary. Only checked when present.
export function validateStatsSummary(req, res, next) {
  const { month, currency } = req.query;

  if (month !== undefined && !MONTH_REGEX.test(month)) {
    throw httpError(400, "Month must be in YYYY-MM format");
  }
  if (currency !== undefined && !CURRENCY_REGEX.test(currency)) {
    throw httpError(400, "Currency must be a 3-letter ISO code");
  }
  next();
}
