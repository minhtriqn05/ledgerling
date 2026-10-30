import mongoose from "mongoose";

// One deposit (amount > 0) or withdrawal (amount < 0). Lives inside the goal, so it has no userId of its own.
const contributionSchema = new mongoose.Schema({
  // In VND, a whole number that is never 0
  amount: { type: Number, required: true },
  note: { type: String, default: "", trim: true, maxlength: 200 },
  // Noon Vietnam time of the day it happened
  date: { type: Date, required: true },
});

const goalSchema = new mongoose.Schema(
  {
    // Owner of the goal; always taken from the token, never from the request body
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
    // In VND
    targetAmount: { type: Number, required: true, min: [1, "Target amount must be greater than 0"] },
    // Changed only by the contribution routes, with one atomic update, so it never goes below 0
    savedAmount: { type: Number, default: 0, min: [0, "Saved amount cannot be below 0"] },
    // Noon Vietnam time of the last day; null means no deadline
    deadline: { type: Date, default: null },
    // Hex code like #FF7043
    color: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
    contributions: { type: [contributionSchema], default: [] },
  },
  // Adds createdAt and updatedAt
  { timestamps: true }
);

// userId and __v are internal, so they never reach the client
goalSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.userId;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Goal", goalSchema);
