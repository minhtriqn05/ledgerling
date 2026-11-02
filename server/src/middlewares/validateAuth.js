import { httpError } from "../utils/httpError.js";
import { checkName, text } from "../utils/validation.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The longest address an email can have (RFC 5321)
const MAX_EMAIL_LENGTH = 254;

const isEmail = (email) => email.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(email);

// Express 5 leaves req.body undefined when no JSON body is sent, so start from {}.
// text() turns anything that is not a string into "".

// On success, req.body is replaced by only the fields we expect, cleaned.
// Extra fields (e.g. a passwordHash sent by a client) are dropped.
export function validateRegister(req, res, next) {
  const body = req.body ?? {};
  const name = checkName(body.name, 50);
  const email = text(body.email).trim().toLowerCase();
  const password = text(body.password); // never trimmed: spaces may be part of a password

  if (!isEmail(email)) throw httpError(400, "Email is invalid", "EMAIL_INVALID");
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

  if (!isEmail(email)) throw httpError(400, "Email is invalid", "EMAIL_INVALID");
  if (!password) throw httpError(400, "Password is required", "PASSWORD_REQUIRED");

  req.body = { email, password };
  next();
}
