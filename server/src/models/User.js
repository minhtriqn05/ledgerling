import mongoose from "mongoose";
import { LANGUAGE_CODES } from "../utils/languages.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    // unique builds a MongoDB index, so the database itself rejects a second account with the same email
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Only the bcrypt hash is stored, never the password
    passwordHash: { type: String, required: true },
    // Stored in the JWT (as "tv"). Raising it makes every token issued before invalid, which logs out every device.
    tokenVersion: { type: Number, default: 0 },
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
    return ret;
  },
});

export default mongoose.model("User", userSchema);
