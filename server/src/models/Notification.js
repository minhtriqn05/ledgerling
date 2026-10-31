import mongoose from "mongoose";

// Each type belongs to one switch in User.preferences.notifications (see notificationService.js)
export const NOTIFICATION_TYPES = [
  "budget_warning",
  "budget_over",
  "goal_completed",
  "recurring_created",
  "weekly_summary",
];

const notificationSchema = new mongoose.Schema(
  {
    // Owner of the notification; always taken from the token, never from the request body
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true, enum: NOTIFICATION_TYPES },
    // English text for people reading the API; the client builds its own text from type + params
    title: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    // A path inside the app, like "/budgets?month=2026-10"
    link: { type: String, default: "", trim: true, maxlength: 200 },
    // The numbers and names the text was built from (percent, categoryName, count...)
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
    // Says which event this notification is about, so the same event never notifies twice
    dedupeKey: { type: String, required: true, maxlength: 200 },
  },
  // Adds createdAt and updatedAt
  { timestamps: true }
);

// The database itself refuses a second notification for the same event, even if two requests race
notificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
// The list (newest first) and the unread count both filter by user and read
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// userId and __v are internal, so they never reach the client
notificationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.userId;
    delete ret.dedupeKey;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Notification", notificationSchema);
