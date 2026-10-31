import { httpError } from "../utils/httpError.js";

const NOTIFICATION_SWITCHES = ["budget", "goals", "recurring", "weekly"];

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Only the switches that are sent change; the others keep their value.
// On success, req.body is replaced by { notifications: { <switch>: true | false, ... } } with only the known switches.
export function validatePreferences(req, res, next) {
  const body = req.body ?? {};

  const unknownField = Object.keys(body).find((key) => key !== "notifications");
  if (unknownField) throw httpError(400, "Only notifications can be changed");
  if (body.notifications === undefined) throw httpError(400, "Nothing to update");
  if (!isPlainObject(body.notifications)) throw httpError(400, "Notifications must be an object");

  const notifications = {};
  for (const [key, value] of Object.entries(body.notifications)) {
    if (!NOTIFICATION_SWITCHES.includes(key)) {
      throw httpError(400, `Notifications can only have ${NOTIFICATION_SWITCHES.join(", ")}`);
    }
    if (typeof value !== "boolean") throw httpError(400, `Notification setting "${key}" must be true or false`);
    notifications[key] = value;
  }
  if (Object.keys(notifications).length === 0) throw httpError(400, "Nothing to update");

  req.body = { notifications };
  next();
}
