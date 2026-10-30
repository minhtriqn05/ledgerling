import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
    // Owner of the template; always taken from the token, never from the request body
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    // Always a category of the same user (checked by the service). The type of the transaction comes from it.
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    // In VND
    amount: { type: Number, required: true, min: [0.000001, "Amount must be greater than 0"] },
    note: { type: String, default: "", trim: true, maxlength: 200 },
  },
  // Adds createdAt and updatedAt
  { timestamps: true }
);

// userId and __v are internal. categoryId is always populated, so it is returned as "category".
templateSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.category = ret.categoryId;
    delete ret.categoryId;
    delete ret.userId;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("TransactionTemplate", templateSchema);
