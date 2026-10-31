import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { createDefaultCategories } from "./categoryService.js";
import { httpError } from "../utils/httpError.js";
import { DEMO_EMAIL } from "../utils/demo.js";

const SALT_ROUNDS = 10;

// The token says who the user is (sub = subject) and which token version it belongs to (tv).
// It is signed, not encrypted: never put secrets in it.
export function signToken(user) {
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

export async function register({ name, email, password }) {
  // Friendly message first; the unique index on email is the safety net if two requests race
  const existing = await User.exists({ email });
  if (existing) throw httpError(409, "Email is already registered", "EMAIL_TAKEN");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash });
  // Every new account starts with a ready-made set of categories
  await createDefaultCategories(user._id);

  return { token: signToken(user), user };
}

export async function getCurrentUser(userId) {
  // A valid token can outlive its account (e.g. the user was deleted), so check the database
  const user = await User.findById(userId);
  if (!user) throw httpError(401, "Not authorized, invalid token", "TOKEN_INVALID");
  return user;
}

export async function login({ email, password }) {
  const user = await User.findOne({ email });
  // Same message for an unknown email and a wrong password, so nobody can learn which emails exist
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw httpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  // Checked after the password, so only the owner of the account learns that it was disabled
  if (user.status === "disabled") throw httpError(403, "Account disabled", "ACCOUNT_DISABLED");

  return { token: signToken(user), user };
}

// Raises the token version: every token made before (on every device) stops working.
// The device that asked gets a new token, so it stays signed in.
export async function logoutAll(userId) {
  const user = await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } }, { returnDocument: "after" });
  if (!user) throw httpError(401, "Not authorized, invalid token", "TOKEN_INVALID");
  return { token: signToken(user), user };
}

// "Try the demo": signs in as the demo user without a password. The account is made by `npm run seed`;
// until then (or after someone deleted it) there is nothing to sign in to.
export async function loginDemo() {
  const user = await User.findOne({ email: DEMO_EMAIL });
  if (!user || user.status === "disabled") throw httpError(503, "Demo account is not available", "DEMO_UNAVAILABLE");
  return { token: signToken(user), user };
}
