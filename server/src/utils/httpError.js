// Creates an Error that carries an HTTP status code.
// Services throw it; errorHandler (middlewares/errorHandler.js) sends it as { success: false, message }.
export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
