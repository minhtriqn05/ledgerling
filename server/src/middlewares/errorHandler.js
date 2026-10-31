import { DEFAULT_CODES } from "../utils/httpError.js";

export function notFound(req, res) {
  res.status(404).json({ success: false, message: "Route not found", code: "ROUTE_NOT_FOUND" });
}

// Map known error types to a status code, a client-safe message and a stable code
function normalizeError(err) {
  // Malformed JSON body (thrown by express.json())
  if (err.type === "entity.parse.failed") {
    return { status: 400, message: "Invalid JSON body", code: "INVALID_JSON" };
  }
  // Mongoose schema validation failed
  if (err.name === "ValidationError") {
    return { status: 400, message: err.message, code: "VALIDATION_ERROR" };
  }
  // Mongoose cast failed, e.g. an invalid ObjectId in the URL
  if (err.name === "CastError") {
    return { status: 400, message: `Invalid ${err.path}`, code: "VALIDATION_ERROR" };
  }
  // MongoDB unique index violated
  if (err.code === 11000) {
    return { status: 409, message: "Duplicate value", code: "DUPLICATE_VALUE" };
  }
  const status = err.status || 500;
  return {
    status,
    message: status === 500 ? "Internal server error" : err.message,
    code: status === 500 ? DEFAULT_CODES[500] : err.code ?? DEFAULT_CODES[status] ?? "REQUEST_ERROR",
  };
}

// Express recognises an error handler by its 4 parameters
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const { status, message, code } = normalizeError(err);
  if (status === 500) console.error(err);
  res.status(status).json({ success: false, message, code });
}
