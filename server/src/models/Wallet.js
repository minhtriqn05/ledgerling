import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    // Owner of the wallet; always taken from the token, never from the request body
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 30 },
    type: { type: String, required: true, enum: ["cash", "bank", "ewallet"] },
    // Hex code like #3DB383
    color: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
    // The money in the wallet before the first transaction, in VND
    initialBalance: { type: Number, default: 0, min: 0 },
    // An archived wallet keeps its balance but takes no new transactions or transfers
    archived: { type: Boolean, default: false },
    // The Cash wallet every user has (see ensureDefaultWallet). Only the server sets this.
    isDefault: { type: Boolean, default: false },
  },
  // Adds createdAt and updatedAt
  { timestamps: true }
);

// A user cannot have two wallets with the same name. Collation strength 2 ignores case, like the categories.
walletSchema.index({ userId: 1, name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
// A user has one default wallet, even when two requests create it at the same time.
// Partial: the other wallets are not in this index, so a user can have many of them.
walletSchema.index({ userId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

// userId and __v are internal, so they never reach the client
walletSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.userId;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Wallet", walletSchema);
