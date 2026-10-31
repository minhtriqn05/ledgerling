import { emitDataChanged } from "../services/realtimeService.js";

// Tells the other devices of the user that a resource changed, after any request that wrote to it and succeeded.
// It sits in front of a whole router (routes/index.js), so a new route can never forget it. req.user is set later,
// by requireAuth inside that router, so it is read when the answer has been sent.
export function liveChanges(resource) {
  return (req, res, next) => {
    if (req.method !== "GET") {
      res.on("finish", () => {
        if (req.user && res.statusCode < 400) {
          emitDataChanged(req.user.id, resource, { except: req.get("X-Socket-Id") });
        }
      });
    }
    next();
  };
}
