import User from "../models/User.js";
import { httpError } from "../utils/httpError.js";

// Changes only the switches that are sent. $set on one path each (not on the whole object),
// so a switch that is not sent keeps its value.
export async function updatePreferences(userId, { notifications }) {
  const changes = {};
  for (const [key, value] of Object.entries(notifications)) {
    changes[`preferences.notifications.${key}`] = value;
  }

  const user = await User.findByIdAndUpdate(userId, { $set: changes }, { returnDocument: "after", runValidators: true });
  // A valid token can outlive its account (e.g. the user was deleted)
  if (!user) throw httpError(401, "Not authorized, invalid token", "TOKEN_INVALID");
  return user;
}
