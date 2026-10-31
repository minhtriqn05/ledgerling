import { rateLimit } from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

// Same error format as every other error: { success, message, code }
function tooManyRequests(req, res) {
  res.status(429).json({
    success: false,
    message: "Too many requests, please try again later",
    code: "RATE_LIMITED",
  });
}

function limiter(max, options = {}) {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: max,
    // RateLimit-* headers tell the client how many requests are left
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
    ...options,
  });
}

// Counts requests per IP address (the real one: app.js sets "trust proxy" for Render), in the memory of this server.
// The counters start again from 0 when the server restarts, which is fine for a small project.
// Every call makes new counters, so each app made by createApp() has its own.

// All of /api: 300 requests / 15 minutes. The health check is free, so a monitor never uses up the limit.
export function apiLimiter() {
  return limiter(300, { skip: (req) => req.path === "/health" });
}

// Login and register: 20 requests / 15 minutes, to slow down password guessing
export function authLimiter() {
  return limiter(20);
}
