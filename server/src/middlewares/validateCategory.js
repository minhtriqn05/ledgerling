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

// Only name and color can change. type is copied into every transaction of the category, so it is locked.
export function validateUpdateCategory(req, res, next) {
  const body = req.body ?? {};
  const changes = {};

  if (body.type !== undefined) throw httpError(400, "Type cannot be changed");

  if (body.name !== undefined) {
    const name = text(body.name).trim();
    if (!name) throw httpError(400, "Name is required");
    if (name.length > 30) throw httpError(400, "Name must be at most 30 characters");
    changes.name = name;
  }
  if (body.color !== undefined) {
    const color = text(body.color).trim();
    if (!COLOR_REGEX.test(color)) throw httpError(400, "Color must be a hex code like #FF7043");
    changes.color = color;
  }

  if (Object.keys(changes).length === 0) throw httpError(400, "Nothing to update");

  req.body = changes;
  next();
}

// A malformed id can never match anything, so answer 404 instead of letting Mongoose throw a CastError.
export function validateCategoryId(req, res, next) {
  if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) throw httpError(404, "Category not found");
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
