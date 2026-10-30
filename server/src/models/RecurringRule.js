import mongoose from "mongoose";

const recurringRuleSchema = new mongoose.Schema(
  {
    // Owner of the rule; always taken from the token, never from the request body
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    // In VND, like the transactions the rule creates
    amount: { type: Number, required: true, min: [0.000001, "Amount must be greater than 0"] },
    note: { type: String, default: "", trim: true, maxlength: 200 },
    frequency: { type: String, required: true, enum: ["weekly", "monthly"] },
    // All three dates are stored at noon Vietnam time, so one day is always exactly one Date
    startDate: { type: Date, required: true },
    // The next date to create a transaction for
    nextRunDate: { type: Date, required: true },
    // The last day that can run; null means the rule never ends
    endDate: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  // Adds createdAt and updatedAt
  { timestamps: true }
);

// Speeds up the search for due rules, which runs on most page loads
recurringRuleSchema.index({ userId: 1, active: 1, nextRunDate: 1 });
// Speeds up the check made before a category is deleted
recurringRuleSchema.index({ userId: 1, categoryId: 1 });

// userId and __v are internal. categoryId is always populated, so it is returned as "category".
// ended tells the client that the rule has passed its end date and will not run again.
recurringRuleSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.category = ret.categoryId;
    ret.ended = Boolean(ret.endDate && ret.nextRunDate > ret.endDate);
    delete ret.categoryId;
    delete ret.userId;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("RecurringRule", recurringRuleSchema);
