import { httpError } from "../utils/httpError.js";
import { CATEGORY_ICON_NAMES } from "../utils/categoryIcons.js";
import { checkColor, checkName, text, validIdParam } from "../utils/validation.js";

const TYPES = ["income", "expense"];
const NAME_MAX = 30;

const ICON_MESSAGE = "Icon must be an icon name or a single emoji";
const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

// The icon: a name from the icon set of the client, an older single emoji, or null / "" for "no icon".
// Returns the cleaned value (a name, an emoji or null).
// One emoji = exactly one visible character (a flag or "👨‍👩‍👧" is one too) that is a pictograph, so "ab" or "7" are refused.
function checkIcon(value) {
  if (value === null || value === "") return null;
  const icon = text(value).trim();
  if (CATEGORY_ICON_NAMES.includes(icon)) return icon;
  const isOneEmoji = [...graphemes.segment(icon)].length === 1 && /\p{Extended_Pictographic}/u.test(icon);
  if (!isOneEmoji || icon.length > 16) throw httpError(400, ICON_MESSAGE, "ICON_INVALID");
  return icon;
}

// On success, req.body is replaced by only the fields we expect, cleaned.
// userId is never read from the body: the controller uses the user from the token.
export function validateCreateCategory(req, res, next) {
  const body = req.body ?? {};
  const name = checkName(body.name, NAME_MAX);
  const type = text(body.type);
  if (!TYPES.includes(type)) throw httpError(400, "Type must be income or expense", "TYPE_INVALID");
  const color = checkColor(body.color);

  req.body = { name, type, color };
  if (body.icon !== undefined) req.body.icon = checkIcon(body.icon);
  next();
}

// Only name, color and icon can change. type is copied into every transaction of the category, so it is locked.
export function validateUpdateCategory(req, res, next) {
  const body = req.body ?? {};
  const changes = {};

  if (body.type !== undefined) throw httpError(400, "Type cannot be changed", "TYPE_LOCKED");

  if (body.name !== undefined) changes.name = checkName(body.name, NAME_MAX);
  if (body.color !== undefined) changes.color = checkColor(body.color);
  if (body.icon !== undefined) changes.icon = checkIcon(body.icon);

  if (Object.keys(changes).length === 0) throw httpError(400, "Nothing to update");

  req.body = changes;
  next();
}

export const validateCategoryId = validIdParam("id", "Category not found", "CATEGORY_NOT_FOUND");

// The optional ?type= filter. Only checked when it is present.
export function validateListCategories(req, res, next) {
  const { type } = req.query;
  if (type !== undefined && !TYPES.includes(type)) {
    throw httpError(400, "Type must be income or expense", "TYPE_INVALID");
  }
  next();
}
