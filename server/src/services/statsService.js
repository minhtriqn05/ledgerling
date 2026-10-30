import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import { currentMonth, monthRange, shiftMonth, VIETNAM_TIMEZONE } from "../utils/month.js";

// The chart shows the chosen month and the 5 months before it
const CHART_MONTHS = 6;

// Everything the dashboard needs for one month, computed by MongoDB with 3 aggregation pipelines.
// Only transactions in one currency are summed, so 10 USD is never added as 10 VND.
export async function getSummary(userId, { month = currentMonth(), currency = "VND" }) {
  // Unlike find(), aggregate() does not cast types: the id from the token is a string and must
  // become an ObjectId, otherwise $match finds nothing
  const owner = new mongoose.Types.ObjectId(userId);
  const { from, to } = monthRange(month);
  const firstMonth = shiftMonth(month, -(CHART_MONTHS - 1));
  const chartFrom = monthRange(firstMonth).from;
  const inMonth = { userId: owner, currency, date: { $gte: from, $lt: to } };

  const [totals, expenseByCategory, monthTotals] = await Promise.all([
    // 1. Income and expense of the month: one group per type
    Transaction.aggregate([
      { $match: inMonth },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]),

    // 2. Expense of the month per category, with the category's name and color
    Transaction.aggregate([
      { $match: { ...inMonth, type: "expense" } },
      { $group: { _id: "$categoryId", total: { $sum: "$amount" } } },
      // "categories" is the MongoDB collection of the Category model
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
      { $unwind: "$category" },
      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          name: "$category.name",
          color: "$category.color",
          icon: "$category.icon",
          total: 1,
        },
      },
      { $sort: { total: -1, name: 1 } },
    ]),

    // 3. Income and expense per month for the chart. $dateToString reads each date in Vietnam
    // time, so 00:30 on the 1st (still the day before in UTC) counts in the right month.
    Transaction.aggregate([
      { $match: { userId: owner, currency, date: { $gte: chartFrom, $lt: to } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date", timezone: VIETNAM_TIMEZONE } },
          income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
          expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
        },
      },
    ]),
  ]);

  const totalOf = (type) => totals.find((t) => t._id === type)?.total ?? 0;
  const totalIncome = totalOf("income");
  const totalExpense = totalOf("expense");

  // A month without transactions has no group, so it gets 0.
  // The chart always gets 6 points, oldest first.
  const byMonth = Array.from({ length: CHART_MONTHS }, (_, i) => {
    const label = shiftMonth(firstMonth, i);
    const found = monthTotals.find((m) => m._id === label);
    return { month: label, income: found?.income ?? 0, expense: found?.expense ?? 0 };
  });

  return {
    month,
    currency,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    expenseByCategory,
    byMonth,
  };
}
