import mongoose from "mongoose";
import { LANGUAGE_CODES } from "../utils/languages.js";
import { isDemoEmail } from "../utils/demo.js";

// The picture of the user. "preset" = the id of a ready-made avatar (utils/avatars.js), "upload" = a data URL of the
// user's own photo (a 256x256 WebP made by the app). No avatar at all = the app shows the first letter of the name.
const avatarSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["preset", "upload"], required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    // unique builds a MongoDB index, so the database itself rejects a second account with the same email
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Only the bcrypt hash is stored, never the password
    passwordHash: { type: String, required: true },
    avatar: { type: avatarSchema },
    // Stored in the JWT (as "tv"). Raising it makes every token issued before invalid, which logs out every device.
    tokenVersion: { type: Number, default: 0 },
    // "admin" can open the Admin pages (/api/admin/*). Nobody can become one through the API: see scripts/make-admin.js.
    role: { type: String, enum: ["user", "admin"], default: "user" },
    // A "disabled" account cannot log in; disabling also raises tokenVersion so the tokens it already has stop working
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    preferences: {
      theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
      weekStartsOn: { type: String, enum: ["monday", "sunday"], default: "monday" },
      // No default: until the user picks one, each device keeps the language it already has
      language: { type: String, enum: LANGUAGE_CODES },
      // One switch per kind of notification; an account made before this field existed counts as "all on"
      notifications: {
        budget: { type: Boolean, default: true },
        goals: { type: Boolean, default: true },
        recurring: { type: Boolean, default: true },
        weekly: { type: Boolean, default: true },
      },
    },
  },
  // Adds createdAt and updatedAt
  { timestamps: true }
);

// Runs whenever a user is turned into JSON (e.g. res.json(user)),
// so the password hash, the token version and Mongoose's internal __v never reach the client
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.tokenVersion;
    delete ret.__v;
    // The app hides the settings that would lock other visitors out of the shared demo account
    ret.isDemo = isDemoEmail(ret.email);
    return ret;
  },
});

export default mongoose.model("User", userSchema);
