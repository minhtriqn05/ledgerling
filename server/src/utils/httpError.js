// The code an error gets when the place that throws it does not name a more specific one.
export const DEFAULT_CODES = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  500: "INTERNAL_ERROR",
};

// Creates an Error that carries an HTTP status code and a stable error code.
// Services throw it; errorHandler (middlewares/errorHandler.js) sends it as { success: false, message, code }.
// message stays in English for people reading the API; the client translates by code, so a code never changes meaning.
export function httpError(status, message, code = DEFAULT_CODES[status]) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}
