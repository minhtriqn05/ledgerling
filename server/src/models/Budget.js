import mongoose from "mongoose";
import { MONTH_REGEX } from "../utils/month.js";

const budgetSchema = new mongoose.Schema(
  {
    // Owner of the budget; always taken from the token, never from the request body
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Always an expense category of the same user (checked by the service)
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    // "YYYY-MM", counted in Vietnam time like every month filter
    month: { type: String, required: true, match: MONTH_REGEX },
    // Spending limit in VND
    amount: { type: Number, required: true, min: [0.000001, "Amount must be greater than 0"] },
  },
  // Adds createdAt and updatedAt
  { timestamps: true }
);

// One budget per category and month for each user
budgetSchema.index({ userId: 1, categoryId: 1, month: 1 }, { unique: true });

// userId and __v are internal. categoryId is always populated, so it is returned as "category".
budgetSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.category = ret.categoryId;
    delete ret.categoryId;
    delete ret.userId;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Budget", budgetSchema);
