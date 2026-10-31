import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import { httpError } from "../utils/httpError.js";

// Protects a route: the client must send "Authorization: Bearer <token>".
// The signature is checked with JWT_SECRET, then the user is read from the database to compare the token version
// ("tv" in the token vs User.tokenVersion). Changing the password or "log out of all devices" raises the version,
// so every older token stops working at once. A deleted user is refused the same way.
// A disabled account is refused too (disabling also raises the version, this is the safety net).
// On success, req.user = { id, role } where id comes from the token (never from the request body)
// and role is read from the database, so making someone an admin (or not) applies at once.
export async function requireAuth(req, res, next) {
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

  const user = mongoose.isValidObjectId(payload.sub) ? await User.findById(payload.sub).select("tokenVersion role status").lean() : null;
  // A token made before tokenVersion existed has no "tv"; it counts as version 0
  if (!user || user.status === "disabled" || (payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
    throw httpError(401, "Not authorized, invalid token", "TOKEN_INVALID");
  }

  req.user = { id: payload.sub, role: user.role ?? "user" };
  next();
}
