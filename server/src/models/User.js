import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    // unique builds a MongoDB index, so the database itself rejects a second account with the same email
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Only the bcrypt hash is stored, never the password
    passwordHash: { type: String, required: true },
  },
  // Adds createdAt and updatedAt
  { timestamps: true }
);

// Runs whenever a user is turned into JSON (e.g. res.json(user)),
// so the password hash and Mongoose's internal __v never reach the client
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
