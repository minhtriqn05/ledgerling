import { httpError } from "../utils/httpError.js";
import { todayInVietnam } from "../utils/month.js";
import { checkColor, checkDay, checkName, checkNote, isWholeAmount, validIdParam } from "../utils/validation.js";

const NAME_MAX = 60;

// Whole VND only: no decimals means $inc adds up exactly, however many requests arrive at the same time
function checkTargetAmount(value) {
  if (!isWholeAmount(value) || value <= 0) {
    throw httpError(400, "Target amount must be a whole number greater than 0", "TARGET_INVALID");
  }
  return value;
}

// No deadline (left out, null or an empty form field) means the goal has none.
// mustBeFuture is true only when a goal is created, so a goal whose deadline has passed can still be edited.
function checkDeadline(value, mustBeFuture) {
  if (value === undefined || value === null || value === "") return null;
  const deadline = checkDay(value, "Deadline");
  // Same format, so comparing the strings compares the days
  if (mustBeFuture && deadline <= todayInVietnam()) throw httpError(400, "Deadline must be after today", "DEADLINE_IN_PAST");
  return deadline;
}

// On success, req.body is replaced by only the fields we expect, cleaned.
// userId and savedAmount are never read from the body: the owner comes from the token,
// and savedAmount changes only through the contribution routes.
function goalFields(body, mustBeFuture) {
  return {
    name: checkName(body.name, NAME_MAX),
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
    throw httpError(400, "Amount must be a whole number other than 0", "AMOUNT_INVALID");
  }

  const note = body.note === undefined || body.note === null ? "" : checkNote(body.note);
  // A missing date means today; the service fills it in
  const hasDate = body.date !== undefined && body.date !== null && body.date !== "";
  req.body = { amount: body.amount, note, date: hasDate ? checkDay(body.date, "Date") : null };
  next();
}

export const validateGoalId = validIdParam("id", "Goal not found", "GOAL_NOT_FOUND");
export const validateContributionId = validIdParam("contributionId", "Contribution not found", "CONTRIBUTION_NOT_FOUND");
