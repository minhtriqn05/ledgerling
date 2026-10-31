import { httpError } from "../utils/httpError.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Express 5 leaves req.body undefined when no JSON body is sent, so start from {}.
// Anything that is not a string counts as empty.
function text(value) {
  return typeof value === "string" ? value : "";
}

// On success, req.body is replaced by only the fields we expect, cleaned.
// Extra fields (e.g. a passwordHash sent by a client) are dropped.
export function validateRegister(req, res, next) {
  const body = req.body ?? {};
  const name = text(body.name).trim();
  const email = text(body.email).trim().toLowerCase();
  const password = text(body.password); // never trimmed: spaces may be part of a password

  if (!name) throw httpError(400, "Name is required", "NAME_REQUIRED");
  if (name.length > 50) throw httpError(400, "Name must be at most 50 characters", "NAME_TOO_LONG");
  if (!EMAIL_REGEX.test(email)) throw httpError(400, "Email is invalid", "EMAIL_INVALID");
  if (password.length < 6) throw httpError(400, "Password must be at least 6 characters", "PASSWORD_TOO_SHORT");
  // bcrypt only uses the first 72 bytes of a password
  if (password.length > 72) throw httpError(400, "Password must be at most 72 characters", "PASSWORD_TOO_LONG");

  req.body = { name, email, password };
  next();
}

export function validateLogin(req, res, next) {
  const body = req.body ?? {};
  const email = text(body.email).trim().toLowerCase();
  const password = text(body.password);

  if (!EMAIL_REGEX.test(email)) throw httpError(400, "Email is invalid", "EMAIL_INVALID");
  if (!password) throw httpError(400, "Password is required", "PASSWORD_REQUIRED");

  req.body = { email, password };
  next();
}
