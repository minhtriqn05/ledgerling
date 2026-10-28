import { httpError } from "../utils/httpError.js";

const TYPES = ["income", "expense"];
const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// Anything that is not a string counts as empty
function text(value) {
  return typeof value === "string" ? value : "";
}

// On success, req.body is replaced by only the fields we expect, cleaned.
// userId is never read from the body: the controller uses the user from the token.
export function validateCreateCategory(req, res, next) {
  const body = req.body ?? {};
  const name = text(body.name).trim();
  const type = text(body.type);
  const color = text(body.color).trim();

  if (!name) throw httpError(400, "Name is required");
  if (name.length > 30) throw httpError(400, "Name must be at most 30 characters");
  if (!TYPES.includes(type)) throw httpError(400, "Type must be income or expense");
  if (!COLOR_REGEX.test(color)) throw httpError(400, "Color must be a hex code like #FF7043");

  req.body = { name, type, color };
  next();
}

// The optional ?type= filter. Only checked when it is present.
export function validateListCategories(req, res, next) {
  const { type } = req.query;
  if (type !== undefined && !TYPES.includes(type)) {
    throw httpError(400, "Type must be income or expense");
  }
  next();
}
