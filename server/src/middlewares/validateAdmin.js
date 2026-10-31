import { httpError } from "../utils/httpError.js";

const STATUSES = ["active", "disabled"];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_SEARCH_LENGTH = 100;
const WHOLE_NUMBER_REGEX = /^\d+$/;

// A whole number inside [min, max] from a query string, or a 400 with this message
function wholeNumber(value, min, max, message) {
  const number = typeof value === "string" && WHOLE_NUMBER_REGEX.test(value) ? Number(value) : 0;
  if (number < min || number > max) throw httpError(400, message);
  return number;
}

// GET /admin/users?q=&page=&limit=. On success req.listQuery = { q, page, limit }.
export function validateUserList(req, res, next) {
  const { q, page, limit } = req.query;

  if (q !== undefined && typeof q !== "string") throw httpError(400, "Search must be text");
  const search = (q ?? "").trim();
  if (search.length > MAX_SEARCH_LENGTH) throw httpError(400, `Search must be at most ${MAX_SEARCH_LENGTH} characters`);

  req.listQuery = {
    q: search,
    page: page === undefined ? 1 : wholeNumber(page, 1, Number.MAX_SAFE_INTEGER, "Page must be a whole number from 1"),
    limit: limit === undefined ? DEFAULT_LIMIT : wholeNumber(limit, 1, MAX_LIMIT, `Limit must be a whole number from 1 to ${MAX_LIMIT}`),
  };
  next();
}

// PATCH /admin/users/:id/status with { status }. On success req.body = { status }.
export function validateStatusChange(req, res, next) {
  // A malformed id cannot belong to any user
  if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) throw httpError(404, "User not found", "USER_NOT_FOUND");

  const status = req.body?.status;
  if (!STATUSES.includes(status)) throw httpError(400, `Status must be one of ${STATUSES.join(", ")}`, "STATUS_INVALID");

  req.body = { status };
  next();
}
