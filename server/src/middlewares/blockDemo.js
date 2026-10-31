import { httpError } from "../utils/httpError.js";

// Put after requireAuth on the routes that would lock every other visitor out of the shared demo account
// (change the password, log out of all devices) or destroy it (delete the account).
export function blockDemo(req, res, next) {
  if (req.user.isDemo) throw httpError(403, "Not available in the demo account", "DEMO_READ_ONLY");
  next();
}
