import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { httpError } from "../utils/httpError.js";

const SALT_ROUNDS = 10;

// The token only says who the user is (sub = subject). It is signed, not encrypted: never put secrets in it.
function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

export async function register({ name, email, password }) {
  // Friendly message first; the unique index on email is the safety net if two requests race
  const existing = await User.findOne({ email });
  if (existing) throw httpError(409, "Email is already registered");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash });

  return { token: signToken(user._id), user };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email });
  // Same message for an unknown email and a wrong password, so nobody can learn which emails exist
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw httpError(401, "Invalid email or password");

  return { token: signToken(user._id), user };
}
