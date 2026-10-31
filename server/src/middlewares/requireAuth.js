import jwt from "jsonwebtoken";
import { httpError } from "../utils/httpError.js";

// Protects a route: the client must send "Authorization: Bearer <token>".
// Stateless: the token is checked with JWT_SECRET only, no database query.
// On success, req.user = { id } where id comes from the token (never from the request body).
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw httpError(401, "Not authorized, token missing", "TOKEN_MISSING");
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // Wrong signature, malformed or expired token
    throw httpError(401, "Not authorized, invalid token", "TOKEN_INVALID");
  }

  req.user = { id: payload.sub };
  next();
}
