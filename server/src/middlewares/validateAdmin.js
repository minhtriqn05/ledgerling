import { httpError } from "../utils/httpError.js";
import { isObjectId, readLimit, readPage } from "../utils/validation.js";

const STATUSES = ["active", "disabled"];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_SEARCH_LENGTH = 100;

// GET /admin/users?q=&page=&limit=. On success req.listQuery = { q, page, limit }.
export function validateUserList(req, res, next) {
  const { q, page, limit } = req.query;

  if (q !== undefined && typeof q !== "string") throw httpError(400, "Search must be text");
  const search = (q ?? "").trim();
  if (search.length > MAX_SEARCH_LENGTH) throw httpError(400, `Search must be at most ${MAX_SEARCH_LENGTH} characters`);

  req.listQuery = { q: search, page: readPage(page), limit: readLimit(limit, DEFAULT_LIMIT, MAX_LIMIT) };
  next();
}

// PATCH /admin/users/:id/status with { status }. On success req.body = { status }.
export function validateStatusChange(req, res, next) {
  // A malformed id cannot belong to any user
  if (!isObjectId(req.params.id)) throw httpError(404, "User not found", "USER_NOT_FOUND");

  const status = req.body?.status;
  if (!STATUSES.includes(status)) throw httpError(400, `Status must be one of ${STATUSES.join(", ")}`, "STATUS_INVALID");

  req.body = { status };
  next();
}
