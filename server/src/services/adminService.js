import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { httpError } from "../utils/httpError.js";
import { VIETNAM_TIMEZONE, addDays, dayStart, nextDayStart, todayInVietnam } from "../utils/month.js";

const STATS_DAYS = 30;
const ACTIVE_DAYS = 7;

const dayOfCreation = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: VIETNAM_TIMEZONE } };

// How many documents of a model were created on each of the given days (Vietnam time).
// Days without any get 0, so a chart gets one point per day.
async function countPerDay(model, days) {
  const rows = await model.aggregate([
    { $match: { createdAt: { $gte: dayStart(days[0]), $lt: nextDayStart(days[days.length - 1]) } } },
    { $group: { _id: dayOfCreation, count: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  return days.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

// Numbers for the Admin page. Only totals: no user data and no transaction details.
export async function getStats() {
  const today = todayInVietnam();
  const days = Array.from({ length: STATS_DAYS }, (_, i) => addDays(today, i - (STATS_DAYS - 1)));
  const activeSince = new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000);

  const [totalUsers, totalTransactions, activeUsers, newUsersPerDay, transactionsPerDay] = await Promise.all([
    User.countDocuments(),
    Transaction.countDocuments(),
    // "Active" = added at least one transaction in the last 7 days
    Transaction.distinct("userId", { createdAt: { $gte: activeSince } }).then((ids) => ids.length),
    countPerDay(User, days),
    countPerDay(Transaction, days),
  ]);

  return {
    totalUsers,
    activeUsers7d: activeUsers,
    totalTransactions,
    newUsersPerDay,
    transactionsPerDay,
  };
}

// Only these fields are ever read from the database (never passwordHash), and the answer is built field by field.
function toAdminUser(user, transactionCount) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role ?? "user",
    status: user.status ?? "active",
    createdAt: user.createdAt,
    transactionCount,
  };
}

const USER_FIELDS = "name email avatar role status createdAt";

// The user's own number of transactions, as a number only
async function countsFor(userIds) {
  const rows = await Transaction.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

// Characters that mean something in a regular expression get a backslash, so "a.b" or "(" is searched as plain text
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Newest accounts first. q finds a part of the name or the email (case-insensitive).
export async function listUsers({ q, page, limit }) {
  const filter = q ? { $or: [{ name: new RegExp(escapeRegex(q), "i") }, { email: new RegExp(escapeRegex(q), "i") }] } : {};

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select(USER_FIELDS)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);
  const counts = await countsFor(users.map((user) => user._id));

  return {
    users: users.map((user) => toAdminUser(user, counts.get(String(user._id)) ?? 0)),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// Disables or enables an account. An admin cannot disable himself or another admin.
// Disabling raises tokenVersion, so the tokens the user already has stop working at once.
export async function setUserStatus(adminId, userId, status) {
  const user = await User.findById(userId).select(USER_FIELDS).lean();
  if (!user) throw httpError(404, "User not found", "USER_NOT_FOUND");

  if (status === "disabled") {
    if (String(user._id) === String(adminId)) {
      throw httpError(403, "You cannot disable your own account", "CANNOT_DISABLE_SELF");
    }
    if (user.role === "admin") {
      throw httpError(403, "You cannot disable another admin", "CANNOT_DISABLE_ADMIN");
    }
  }

  // Only a change raises the version, so pressing Disable twice does not log anybody out twice
  if (user.status !== status) {
    const update = status === "disabled" ? { $set: { status }, $inc: { tokenVersion: 1 } } : { $set: { status } };
    await User.updateOne({ _id: userId }, update);
    user.status = status;
  }

  return toAdminUser(user, await Transaction.countDocuments({ userId }));
}
