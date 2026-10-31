import { httpError } from "../utils/httpError.js";

// Second line of defence against NoSQL injection. The first one is the validation of each route, which turns every field
// it uses into a string, a number or an ObjectId. This guard runs before all routes and refuses the shapes an attack needs:
// - { "email": { "$ne": null } } in the body: a key that starts with "$" (a MongoDB operator) or has a "." (a field path)
// - ?month[$ne]=x in the address: a key with "$" or "["
// A normal client never sends any of these. (?month=a&month=b gives an array: the validation of each route refuses it,
// because it only accepts a string there.)

const MAX_DEPTH = 10;

function fail() {
  return httpError(400, "Request contains invalid fields", "INVALID_INPUT");
}

// true when `value` (or anything inside it) has a key that starts with "$" or contains "."
function hasUnsafeKey(value, depth = 0) {
  if (value === null || typeof value !== "object") return false;
  // Nothing real is nested this deep, and refusing it keeps the walk short
  if (depth > MAX_DEPTH) return true;

  if (Array.isArray(value)) return value.some((item) => hasUnsafeKey(item, depth + 1));
  return Object.entries(value).some(([key, item]) => key.startsWith("$") || key.includes(".") || hasUnsafeKey(item, depth + 1));
}

export function rejectOperators(req, res, next) {
  for (const key of Object.keys(req.query)) {
    if (key.startsWith("$") || key.includes("[")) throw fail();
  }
  if (hasUnsafeKey(req.body)) throw fail();
  next();
}
