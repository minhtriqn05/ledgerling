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
  // Body bigger than the limit of express.json() (see app.js)
  if (err.type === "entity.too.large") {
    return { status: 413, message: "Request body is too large", code: "PAYLOAD_TOO_LARGE" };
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
  // Anything unexpected is a 500 with a fixed message: the real error (and its stack trace) goes to the server log only,
  // never into the answer, in production or anywhere else
  // 503 is the exception: the service threw it on purpose ("Demo account is not available"), so its message is safe to show
  const status = err.status || 500;
  const unexpected = status >= 500 && status !== 503;
  return {
    status,
    message: unexpected ? "Internal server error" : err.message,
    code: unexpected ? DEFAULT_CODES[500] : err.code ?? DEFAULT_CODES[status] ?? "REQUEST_ERROR",
  };
}

// Express recognises an error handler by its 4 parameters
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const { status, message, code } = normalizeError(err);
  if (status >= 500 && status !== 503) console.error(err);
  res.status(status).json({ success: false, message, code });
}
