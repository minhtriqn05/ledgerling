import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";

// Every tag the user has used, with how many transactions carry it. Most used first, then A to Z.
export async function listTags(userId) {
  return Transaction.aggregate([
    // aggregate() does not cast types like find(), so the id from the token must become an ObjectId
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $project: { _id: 0, tag: "$_id", count: 1 } },
  ]);
}
