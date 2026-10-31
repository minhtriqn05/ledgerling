import { httpError } from "../utils/httpError.js";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// Anything that is not a string counts as empty
function text(value) {
  return typeof value === "string" ? value : "";
}

// Each helper checks one field and returns the cleaned value, or throws a 400.
function checkName(value) {
  const name = text(value).trim();
  if (!name) throw httpError(400, "Name is required", "NAME_REQUIRED");
  if (name.length > 40) throw httpError(400, "Name must be at most 40 characters", "NAME_TOO_LONG");
  return name;
}

function checkCategoryId(value) {
  const categoryId = text(value).trim();
  if (!OBJECT_ID_REGEX.test(categoryId)) throw httpError(400, "Category id is invalid");
  return categoryId;
}

function checkAmount(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw httpError(400, "Amount must be greater than 0", "AMOUNT_INVALID");
  }
  return value;
}

function checkNote(value) {
  if (typeof value !== "string") throw httpError(400, "Note must be a string");
  const note = value.trim();
  if (note.length > 200) throw httpError(400, "Note must be at most 200 characters", "NOTE_TOO_LONG");
  return note;
}

// On success, req.body is replaced by only the fields we expect, cleaned. userId is never read from the body.
export function validateCreateTemplate(req, res, next) {
  const body = req.body ?? {};

  const data = {
    name: checkName(body.name),
    categoryId: checkCategoryId(body.categoryId),
    amount: checkAmount(body.amount),
  };
  if (body.note !== undefined) data.note = checkNote(body.note);

  req.body = data;
  next();
}

export function validateUpdateTemplate(req, res, next) {
  const body = req.body ?? {};
  const changes = {};

  if (body.name !== undefined) changes.name = checkName(body.name);
  if (body.categoryId !== undefined) changes.categoryId = checkCategoryId(body.categoryId);
  if (body.amount !== undefined) changes.amount = checkAmount(body.amount);
  if (body.note !== undefined) changes.note = checkNote(body.note);

  if (Object.keys(changes).length === 0) throw httpError(400, "Nothing to update");

  req.body = changes;
  next();
}

// A malformed id can never match anything, so answer 404 instead of letting Mongoose throw a CastError.
export function validateTemplateId(req, res, next) {
  if (!OBJECT_ID_REGEX.test(req.params.id)) throw httpError(404, "Template not found", "TEMPLATE_NOT_FOUND");
  next();
}
