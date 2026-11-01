import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    // Owner of the transaction; always taken from the token, never from the request body
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    // The service sets it on every new transaction. It is not "required" here, because a transaction saved before wallets
    // existed has none and must still save when it is edited: such a transaction counts in the user's default wallet.
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
    // Copied from the category by the service, never read from the request body
    type: { type: String, required: true, enum: ["income", "expense"] },
    amount: { type: Number, required: true, min: [0.000001, "Amount must be greater than 0"] },
    // ISO 4217 code like VND or USD
    currency: { type: String, default: "VND", match: /^[A-Z]{3}$/ },
    note: { type: String, default: "", trim: true, maxlength: 200 },
    date: { type: Date, default: Date.now },
    // Lower case, at most 5, each 1-20 of a-z 0-9 - (checked by the request validation)
    tags: { type: [String], default: [] },
    // Only on transactions created by a recurring rule. Stays after the rule is deleted.
    // Never read from a request body: only processDueRules sets it.
    recurringRuleId: { type: mongoose.Schema.Types.ObjectId, ref: "RecurringRule" },
  },
  // Adds createdAt and updatedAt
  { timestamps: true }
);

// Speeds up the monthly list: filter by user and month, newest first
transactionSchema.index({ userId: 1, date: -1 });
// The category filter of the list, newest first
transactionSchema.index({ userId: 1, categoryId: 1, date: -1 });
// The wallet filter of the list, newest first
transactionSchema.index({ userId: 1, walletId: 1, date: -1 });
// Speeds up the tag filter and the tag list (one entry per tag of each transaction)
transactionSchema.index({ userId: 1, tags: 1 });
// A rule never creates two transactions for the same date, even when requests run at the same time.
// Partial: transactions without a rule are not in this index, so they can share a date.
transactionSchema.index(
  { recurringRuleId: 1, date: 1 },
  { unique: true, partialFilterExpression: { recurringRuleId: { $exists: true } } }
);

// userId and __v are internal. categoryId and walletId are populated, so they are returned as "category" and "wallet".
transactionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.category = ret.categoryId;
    ret.wallet = ret.walletId;
    delete ret.categoryId;
    delete ret.walletId;
    delete ret.userId;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Transaction", transactionSchema);
