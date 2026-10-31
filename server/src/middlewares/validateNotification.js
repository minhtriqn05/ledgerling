import { httpError } from "../utils/httpError.js";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const WHOLE_NUMBER_REGEX = /^\d+$/;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// A malformed id can never match anything, so answer 404 instead of letting Mongoose throw a CastError.
export function validateNotificationId(req, res, next) {
  if (!OBJECT_ID_REGEX.test(req.params.id)) {
    throw httpError(404, "Notification not found", "NOTIFICATION_NOT_FOUND");
  }
  next();
}

// Every filter is optional. On success the cleaned values, with their defaults, are put in req.listQuery
// (Express 5 does not let us replace req.query).
export function validateListNotifications(req, res, next) {
  const { page, limit, unread } = req.query;

  const listQuery = { page: 1, limit: DEFAULT_LIMIT, unread: false };
  if (page !== undefined) {
    listQuery.page = typeof page === "string" && WHOLE_NUMBER_REGEX.test(page) ? Number(page) : 0;
    if (listQuery.page < 1) throw httpError(400, "Page must be a whole number from 1");
  }
  if (limit !== undefined) {
    listQuery.limit = typeof limit === "string" && WHOLE_NUMBER_REGEX.test(limit) ? Number(limit) : 0;
    if (listQuery.limit < 1 || listQuery.limit > MAX_LIMIT) {
      throw httpError(400, `Limit must be a whole number from 1 to ${MAX_LIMIT}`);
    }
  }
  if (unread !== undefined) {
    if (unread !== "true" && unread !== "false") throw httpError(400, "Unread must be true or false");
    listQuery.unread = unread === "true";
  }

  req.listQuery = listQuery;
  next();
}
