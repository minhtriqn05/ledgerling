import { httpError } from "../utils/httpError.js";
import { checkAmount, checkId, checkName, checkNote, validIdParam } from "../utils/validation.js";

// Each helper checks one field and returns the cleaned value, or throws a 400.
const NAME_MAX = 40;
const checkCategoryId = (value) => checkId(value, "Category id is invalid");

// On success, req.body is replaced by only the fields we expect, cleaned. userId is never read from the body.
export function validateCreateTemplate(req, res, next) {
  const body = req.body ?? {};

  const data = {
    name: checkName(body.name, NAME_MAX),
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

  if (body.name !== undefined) changes.name = checkName(body.name, NAME_MAX);
  if (body.categoryId !== undefined) changes.categoryId = checkCategoryId(body.categoryId);
  if (body.amount !== undefined) changes.amount = checkAmount(body.amount);
  if (body.note !== undefined) changes.note = checkNote(body.note);

  if (Object.keys(changes).length === 0) throw httpError(400, "Nothing to update");

  req.body = changes;
  next();
}

export const validateTemplateId = validIdParam("id", "Template not found", "TEMPLATE_NOT_FOUND");
