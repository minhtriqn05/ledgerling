import { httpError } from "../utils/httpError.js";
import { LANGUAGE_CODES } from "../utils/languages.js";

const NOTIFICATION_SWITCHES = ["budget", "goals", "recurring", "weekly"];
const THEMES = ["light", "dark", "system"];
const WEEK_STARTS = ["monday", "sunday"];
const PREFERENCE_FIELDS = ["notifications", "theme", "weekStartsOn", "language"];

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Anything that is not a string counts as empty
function text(value) {
  return typeof value === "string" ? value : "";
}

function validateNotifications(value) {
  if (!isPlainObject(value)) throw httpError(400, "Notifications must be an object");

  const notifications = {};
  for (const [key, flag] of Object.entries(value)) {
    if (!NOTIFICATION_SWITCHES.includes(key)) {
      throw httpError(400, `Notifications can only have ${NOTIFICATION_SWITCHES.join(", ")}`);
    }
    if (typeof flag !== "boolean") throw httpError(400, `Notification setting "${key}" must be true or false`);
    notifications[key] = flag;
  }
  if (Object.keys(notifications).length === 0) throw httpError(400, "Nothing to update");
  return notifications;
}

// Only the preferences that are sent change; the others keep their value.
// On success, req.body is replaced by the known fields only, for example
// { theme: "dark", notifications: { budget: false } }.
export function validatePreferences(req, res, next) {
  const body = req.body ?? {};

  const unknownField = Object.keys(body).find((key) => !PREFERENCE_FIELDS.includes(key));
  if (unknownField) throw httpError(400, `Only ${PREFERENCE_FIELDS.join(", ")} can be changed`);
  if (Object.keys(body).length === 0) throw httpError(400, "Nothing to update");

  const clean = {};
  if (body.notifications !== undefined) clean.notifications = validateNotifications(body.notifications);
  if (body.theme !== undefined) {
    if (!THEMES.includes(body.theme)) throw httpError(400, `Theme must be one of ${THEMES.join(", ")}`);
    clean.theme = body.theme;
  }
  if (body.weekStartsOn !== undefined) {
    if (!WEEK_STARTS.includes(body.weekStartsOn)) throw httpError(400, `weekStartsOn must be one of ${WEEK_STARTS.join(", ")}`);
    clean.weekStartsOn = body.weekStartsOn;
  }
  if (body.language !== undefined) {
    if (!LANGUAGE_CODES.includes(body.language)) throw httpError(400, `Language must be one of ${LANGUAGE_CODES.join(", ")}`);
    clean.language = body.language;
  }

  req.body = clean;
  next();
}

// PATCH /users/me: for now only the name
export function validateProfile(req, res, next) {
  const body = req.body ?? {};
  const name = text(body.name).trim();

  if (!name) throw httpError(400, "Name is required", "NAME_REQUIRED");
  if (name.length > 50) throw httpError(400, "Name must be at most 50 characters", "NAME_TOO_LONG");

  req.body = { name };
  next();
}

// PATCH /users/me/password. Passwords are never trimmed: spaces may be part of one.
export function validatePasswordChange(req, res, next) {
  const body = req.body ?? {};
  const currentPassword = text(body.currentPassword);
  const newPassword = text(body.newPassword);

  if (!currentPassword) throw httpError(400, "Current password is required", "CURRENT_PASSWORD_REQUIRED");
  if (newPassword.length < 8) throw httpError(400, "New password must be at least 8 characters", "NEW_PASSWORD_TOO_SHORT");
  // bcrypt only uses the first 72 bytes of a password
  if (newPassword.length > 72) throw httpError(400, "Password must be at most 72 characters", "PASSWORD_TOO_LONG");
  if (newPassword === currentPassword) {
    throw httpError(400, "New password must be different from the current one", "PASSWORD_UNCHANGED");
  }

  req.body = { currentPassword, newPassword };
  next();
}

// DELETE /users/me: the password confirms that the owner (not someone at an unlocked screen) wants this
export function validateDeleteAccount(req, res, next) {
  const password = text((req.body ?? {}).password);
  if (!password) throw httpError(400, "Password is required", "PASSWORD_REQUIRED");

  req.body = { password };
  next();
}
