import { httpError } from "../utils/httpError.js";
import { readLimit, readPage, validIdParam } from "../utils/validation.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const validateNotificationId = validIdParam("id", "Notification not found", "NOTIFICATION_NOT_FOUND");

// Every filter is optional. On success the cleaned values, with their defaults, are put in req.listQuery
// (Express 5 does not let us replace req.query).
export function validateListNotifications(req, res, next) {
  const { page, limit, unread } = req.query;

  const listQuery = { page: readPage(page), limit: readLimit(limit, DEFAULT_LIMIT, MAX_LIMIT), unread: false };
  if (unread !== undefined) {
    if (unread !== "true" && unread !== "false") throw httpError(400, "Unread must be true or false");
    listQuery.unread = unread === "true";
  }

  req.listQuery = listQuery;
  next();
}
