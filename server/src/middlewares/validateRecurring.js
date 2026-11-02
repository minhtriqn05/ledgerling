import { httpError } from "../utils/httpError.js";
import { checkAmount, checkDay, checkId, checkNote, validIdParam } from "../utils/validation.js";

const FREQUENCIES = ["weekly", "monthly"];

function checkFrequency(value) {
  if (!FREQUENCIES.includes(value)) throw httpError(400, "Frequency must be weekly or monthly");
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
    categoryId: checkId(body.categoryId, "Category id is invalid"),
    amount: checkAmount(body.amount),
    // A rule without a note gets an empty one (PUT replaces the whole rule)
    note: body.note === undefined ? "" : checkNote(body.note),
    frequency: checkFrequency(body.frequency),
    startDate,
    endDate,
  };
  next();
}

export const validateRecurringId = validIdParam("id", "Recurring rule not found", "RULE_NOT_FOUND");
