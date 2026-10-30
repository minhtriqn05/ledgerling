import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    // Owner of the category; always taken from the token, never from the request body
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 30 },
    type: { type: String, required: true, enum: ["income", "expense"] },
    // Hex code like #FF7043
    color: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
    // One emoji like "🍜" (checked by the request validation). null = no icon.
    icon: { type: String, default: null, maxlength: 16 },
  },
  // Adds createdAt and updatedAt
  { timestamps: true }
);

// A user cannot have two categories with the same name and type.
// Collation strength 2 ignores case, so "Food" and "food" count as the same name.
categorySchema.index(
  { userId: 1, type: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

// userId and __v are internal, so they never reach the client
categorySchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.userId;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Category", categorySchema);
