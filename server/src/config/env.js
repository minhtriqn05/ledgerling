import jwt from "jsonwebtoken";

// The variables the server cannot work without (see .env.example). server.js stops at start-up when one is missing,
// with a message that names it, instead of failing later on every request. PORT and JWT_EXPIRES_IN have defaults.
// Returns the problems as text, [] when everything is fine. `env` is process.env, a test passes its own.
export function envProblems(env) {
  const problems = [];
  if (!env.MONGODB_URI) problems.push("MONGODB_URI is not set");
  if (!env.JWT_SECRET) problems.push("JWT_SECRET is not set");
  if (!env.CLIENT_URL?.trim()) {
    problems.push("CLIENT_URL is not set (the address of the web app, e.g. https://ledgerling-ten.vercel.app)");
  }
  if (env.JWT_EXPIRES_IN) {
    try {
      // The same call as signToken (services/authService.js), so a value it refuses is found now, not at the first login
      jwt.sign({}, "check", { expiresIn: env.JWT_EXPIRES_IN });
    } catch {
      problems.push(`JWT_EXPIRES_IN "${env.JWT_EXPIRES_IN}" is not a valid duration (use e.g. 7d, 12h or 3600)`);
    }
  }
  return problems;
}
