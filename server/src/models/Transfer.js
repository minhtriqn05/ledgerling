import mongoose from "mongoose";

// Money moved between two wallets of one user. It is not a Transaction on purpose: income, expense, budgets, reports
// and insights only read transactions, so a transfer can never change them. Only the wallet balances read this.
const transferSchema = new mongoose.Schema(
  {
    // Owner of the transfer; always taken from the token, never from the request body
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fromWalletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true },
    toWalletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true },
    // In VND
    amount: { type: Number, required: true, min: [0.000001, "Amount must be greater than 0"] },
    note: { type: String, default: "", trim: true, maxlength: 200 },
    date: { type: Date, default: Date.now },
  },
  // Adds createdAt and updatedAt
  { timestamps: true }
);

// The history, newest first
transferSchema.index({ userId: 1, date: -1 });
// The balance of a wallet and the check made before a wallet is deleted
transferSchema.index({ userId: 1, fromWalletId: 1 });
transferSchema.index({ userId: 1, toWalletId: 1 });

// userId and __v are internal. Both wallets are always populated, so they are returned as "from" and "to".
transferSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.from = ret.fromWalletId;
    ret.to = ret.toWalletId;
    delete ret.fromWalletId;
    delete ret.toWalletId;
    delete ret.userId;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Transfer", transferSchema);
