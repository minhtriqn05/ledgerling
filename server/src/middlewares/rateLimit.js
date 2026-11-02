import { isIP } from "node:net";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

// Same error format as every other error: { success, message, code }
function tooManyRequests(req, res) {
  res.status(429).json({
    success: false,
    message: "Too many requests, please try again later",
    code: "RATE_LIMITED",
  });
}

// The visitor's address. On Render, Cloudflare writes it into CF-Connecting-IP; a visitor cannot send that header
// himself (Cloudflare refuses such a request with 403). Without the header (on this computer, in the tests) it is
// req.ip, found with "trust proxy" in app.js.
export function visitorAddress(req) {
  const fromCloudflare = req.get("CF-Connecting-IP")?.trim();
  return fromCloudflare && isIP(fromCloudflare) ? fromCloudflare : req.ip;
}

// ipKeyGenerator counts a whole IPv6 block (/56) as one visitor, so a new address from the same block is no way around
function visitorKey(req) {
  return ipKeyGenerator(visitorAddress(req));
}

function limiter(max, options = {}) {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: max,
    // RateLimit-* headers tell the client how many requests are left
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: visitorKey,
    handler: tooManyRequests,
    ...options,
  });
}

// Counts requests per visitor address (see visitorAddress), in the memory of this server.
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
