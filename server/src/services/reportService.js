import mongoose from "mongoose";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import {
  VIETNAM_TIMEZONE,
  currentMonth,
  currentYear,
  monthDays,
  monthProgress,
  monthRange,
  shiftMonth,
  yearRange,
} from "../utils/month.js";

// The report lists the 5 biggest categories and tags
const TOP_LIMIT = 5;

const round1 = (number) => Math.round(number * 10) / 10;

// How much `current` changed from `previous`, in percent with 1 decimal (+12.5 or -8).
// null when there is nothing to compare with (previous is 0). The sign is relative to the size of
// `previous`, so a balance that goes from -100 to -50 is +50 (better), not -50.
export function changePercent(current, previous) {
  if (!previous) return null;
  return round1(((current - previous) / Math.abs(previous)) * 100);
}

// aggregate() does not cast types like find(): the id from the token is a string and must become an ObjectId
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// "2026-10" for a date, read in Vietnam time (so 23:30 on the 31st stays in October)
const monthOf = { $dateToString: { format: "%Y-%m", date: "$date", timezone: VIETNAM_TIMEZONE } };
const dayOf = { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: VIETNAM_TIMEZONE } };

function totalsOf(rows, month) {
  const sum = (type) => rows.find((r) => r._id.month === month && r._id.type === type)?.total ?? 0;
  const income = sum("income");
  const expense = sum("expense");
  return { income, expense, balance: income - expense };
}

// Everything the Monthly report needs, computed by MongoDB with 5 queries that run at the same time.
// Returns { report, categories }: `report` is what the API sends (top 5 only), `categories` lists EVERY expense
// category of the two months and is only used by the insights.
// Only transactions in one currency are summed, so 10 USD is never added as 10 VND.
// `today` is a "YYYY-MM-DD" in Vietnam time; it only decides how many days of the month have passed.
export async function loadMonthlyReport(userId, { month, currency, today }) {
  const owner = toObjectId(userId);
  const previousMonth = shiftMonth(month, -1);
  const { from, to } = monthRange(month);
  const inMonth = { userId: owner, currency, date: { $gte: from, $lt: to } };
  // The two months are next to each other, so one range covers both
  const inBoth = { userId: owner, currency, date: { $gte: monthRange(previousMonth).from, $lt: to } };

  const [totalRows, categoryRows, dayRows, tagRows, largest] = await Promise.all([
    // 1. Income and expense of this month and last month
    Transaction.aggregate([
      { $match: inBoth },
      { $group: { _id: { month: monthOf, type: "$type" }, total: { $sum: "$amount" } } },
    ]),

    // 2. Expense per category in both months (for the share, and the change from last month)
    Transaction.aggregate([
      { $match: { ...inBoth, type: "expense" } },
      { $group: { _id: { categoryId: "$categoryId", month: monthOf }, total: { $sum: "$amount" } } },
    ]),

    // 3. Expense per day of this month (days without expenses have no row: they are added below)
    Transaction.aggregate([
      { $match: { ...inMonth, type: "expense" } },
      { $group: { _id: dayOf, total: { $sum: "$amount" } } },
    ]),

    // 4. Expense per tag: a transaction with 2 tags counts in both. $unwind makes one row per tag.
    Transaction.aggregate([
      { $match: { ...inMonth, type: "expense", tags: { $exists: true, $ne: [] } } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1, _id: 1 } },
      { $limit: TOP_LIMIT },
    ]),

    // 5. The single biggest expense of the month (the latest one when two are equal)
    Transaction.findOne({ ...inMonth, type: "expense" })
      .sort({ amount: -1, date: -1 })
      .populate("categoryId", "name color")
      .lean(),
  ]);

  const totals = totalsOf(totalRows, month);
  const previousTotals = totalsOf(totalRows, previousMonth);

  // --- categories: one entry per category, with this month's and last month's total ---
  const byCategory = new Map();
  for (const row of categoryRows) {
    const id = String(row._id.categoryId);
    const entry = byCategory.get(id) ?? { categoryId: row._id.categoryId, total: 0, previousTotal: 0 };
    if (row._id.month === month) entry.total = row.total;
    else entry.previousTotal = row.total;
    byCategory.set(id, entry);
  }
  const categoryDocs = await Category.find({ _id: { $in: [...byCategory.values()].map((c) => c.categoryId) } }).lean();
  const docById = new Map(categoryDocs.map((c) => [String(c._id), c]));

  const categories = [...byCategory.values()]
    .filter((c) => docById.has(String(c.categoryId)))
    .map((c) => {
      const doc = docById.get(String(c.categoryId));
      return {
        categoryId: c.categoryId,
        name: doc.name,
        color: doc.color,
        // The Category model has no icon yet; it is returned as soon as a category has one
        icon: doc.icon ?? null,
        total: c.total,
        percent: totals.expense > 0 ? round1((c.total / totals.expense) * 100) : 0,
        previousTotal: c.previousTotal,
        changePercent: changePercent(c.total, c.previousTotal),
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "en"));

  const topCategories = categories.filter((c) => c.total > 0).slice(0, TOP_LIMIT);

  // --- days: every day of the month has an entry ---
  const spentOn = new Map(dayRows.map((r) => [r._id, r.total]));
  const dailyExpense = monthDays(month).map((date) => ({ date, total: spentOn.get(date) ?? 0 }));
  const { elapsedDays, completedDays } = monthProgress(month, today);
  // Today may still get an expense, so only finished days can be "no-spend" days
  const noSpendDays = dailyExpense.slice(0, completedDays).filter((d) => d.total === 0).length;
  const averagePerDay = elapsedDays > 0 ? Math.round(totals.expense / elapsedDays) : 0;

  const largestExpense = largest
    ? {
        _id: largest._id,
        amount: largest.amount,
        note: largest.note,
        date: largest.date,
        category: {
          _id: largest.categoryId._id,
          name: largest.categoryId.name,
          color: largest.categoryId.color,
          icon: largest.categoryId.icon ?? null,
        },
      }
    : null;

  const report = {
    month,
    currency,
    totals,
    previousMonth,
    previousTotals,
    changes: {
      income: changePercent(totals.income, previousTotals.income),
      expense: changePercent(totals.expense, previousTotals.expense),
      balance: changePercent(totals.balance, previousTotals.balance),
    },
    topCategories,
    dailyExpense,
    averagePerDay,
    noSpendDays,
    largestExpense,
    topTags: tagRows.map((t) => ({ tag: t._id, total: t.total, count: t.count })),
  };
  return { report, categories };
}

export async function getMonthlyReport(userId, { month = currentMonth(), currency = "VND" }) {
  const { report } = await loadMonthlyReport(userId, { month, currency });
  return report;
}

// Income and expense of the 12 months of a year, the year's totals and the month with the most spending
export async function getYearlyReport(userId, { year = currentYear(), currency = "VND" }) {
  const { from, to } = yearRange(year);
  const rows = await Transaction.aggregate([
    { $match: { userId: toObjectId(userId), currency, date: { $gte: from, $lt: to } } },
    {
      $group: {
        _id: monthOf,
        income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
        expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
      },
    },
  ]);

  // A month without transactions has no row, so it gets 0. Always 12 entries, January first.
  const months = Array.from({ length: 12 }, (_, i) => {
    const label = `${year}-${String(i + 1).padStart(2, "0")}`;
    const found = rows.find((r) => r._id === label);
    const income = found?.income ?? 0;
    const expense = found?.expense ?? 0;
    return { month: label, income, expense, balance: income - expense };
  });

  const income = months.reduce((sum, m) => sum + m.income, 0);
  const expense = months.reduce((sum, m) => sum + m.expense, 0);
  // The first month wins a tie; null when the whole year has no expenses
  const biggest = months.reduce((best, m) => (m.expense > best.expense ? m : best), months[0]);

  return {
    year: Number(year),
    currency,
    months,
    totals: { income, expense, balance: income - expense },
    topExpenseMonth: biggest.expense > 0 ? { month: biggest.month, expense: biggest.expense } : null,
  };
}
