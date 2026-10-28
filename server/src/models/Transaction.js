import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    // Owner of the transaction; always taken from the token, never from the request body
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    // Copied from the category by the service, never read from the request body
    type: { type: String, required: true, enum: ["income", "expense"] },
    amount: { type: Number, required: true, min: [0.000001, "Amount must be greater than 0"] },
    // ISO 4217 code like VND or USD
    currency: { type: String, default: "VND", match: /^[A-Z]{3}$/ },
    note: { type: String, default: "", trim: true, maxlength: 200 },
    date: { type: Date, default: Date.now },
  },
  // Adds createdAt and updatedAt
  { timestamps: true }
);

// Speeds up the monthly list: filter by user and month, newest first
transactionSchema.index({ userId: 1, date: -1 });

// userId and __v are internal. categoryId is always populated, so it is returned as "category".
transactionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.category = ret.categoryId;
    delete ret.categoryId;
    delete ret.userId;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Transaction", transactionSchema);
