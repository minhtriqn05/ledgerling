export function notFound(req, res) {
  res.status(404).json({ success: false, message: "Route not found" });
}

// Map known error types to a status code and a client-safe message
function normalizeError(err) {
  // Malformed JSON body (thrown by express.json())
  if (err.type === "entity.parse.failed") {
    return { status: 400, message: "Invalid JSON body" };
  }
  // Mongoose schema validation failed
  if (err.name === "ValidationError") {
    return { status: 400, message: err.message };
  }
  // Mongoose cast failed, e.g. an invalid ObjectId in the URL
  if (err.name === "CastError") {
    return { status: 400, message: `Invalid ${err.path}` };
  }
  // MongoDB unique index violated
  if (err.code === 11000) {
    return { status: 409, message: "Duplicate value" };
  }
  const status = err.status || 500;
  return {
    status,
    message: status === 500 ? "Internal server error" : err.message,
  };
}

// Express recognises an error handler by its 4 parameters
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const { status, message } = normalizeError(err);
  if (status === 500) console.error(err);
  res.status(status).json({ success: false, message });
}
