import { httpError } from "../utils/httpError.js";

// Lets only the given roles through, e.g. router.use(requireAuth, requireRole("admin")).
// It must run after requireAuth, which sets req.user.role from the database.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw httpError(403, "You do not have permission to do this", "FORBIDDEN");
    }
    next();
  };
}
