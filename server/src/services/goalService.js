import Goal from "../models/Goal.js";
import { httpError } from "../utils/httpError.js";
import { dayNoon, todayInVietnam } from "../utils/month.js";

// Filtering by userId as well means another user's goal looks like it does not exist (404)
async function findOwned(userId, id) {
  const goal = await Goal.findOne({ _id: id, userId });
  if (!goal) throw httpError(404, "Goal not found");
  return goal;
}

// The goal as JSON plus how far it is.
// progress is a percent with 1 decimal, rounded down, so 100 always means the goal is reached (99.96% shows as 99.9).
// remaining never goes below 0, even when more than the target was saved.
function withProgress(goal) {
  const progress = Math.min(100, Math.floor((goal.savedAmount / goal.targetAmount) * 1000) / 10);
  return {
    ...goal.toJSON(),
    progress,
    remaining: Math.max(0, goal.targetAmount - goal.savedAmount),
    completed: goal.savedAmount >= goal.targetAmount,
  };
}

// The goal with its history, newest first. Entries of the same day keep the order they were added in (last added first).
function withHistory(goal) {
  const json = withProgress(goal);
  json.contributions = goal.contributions
    .map((contribution, index) => ({ contribution: contribution.toJSON(), index }))
    .sort((a, b) => b.contribution.date - a.contribution.date || b.index - a.index)
    .map((item) => item.contribution);
  return json;
}

// Goals still to reach come first, the nearest deadline first (no deadline last, then the newest goal).
// Completed goals come after them, the most recently changed first.
function sortGoals(goals) {
  return goals.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.completed) return b.updatedAt - a.updatedAt;
    if (a.deadline && b.deadline) return a.deadline - b.deadline || b.createdAt - a.createdAt;
    if (a.deadline || b.deadline) return a.deadline ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
}

// The list does not carry the history of every goal: the cards do not need it (GET /goals/:id has it).
export async function listGoals(userId) {
  const goals = await Goal.find({ userId }).select("-contributions");
  return sortGoals(goals.map(withProgress));
}

export async function getGoal(userId, id) {
  return withHistory(await findOwned(userId, id));
}

export async function createGoal(userId, { name, targetAmount, deadline, color }) {
  const goal = await Goal.create({
    userId,
    name,
    targetAmount,
    deadline: deadline ? dayNoon(deadline) : null,
    color,
  });
  return withHistory(goal);
}

// Replaces name, target, deadline and color. savedAmount and the history are left alone.
export async function updateGoal(userId, id, { name, targetAmount, deadline, color }) {
  const goal = await findOwned(userId, id);
  goal.name = name;
  goal.targetAmount = targetAmount;
  goal.deadline = deadline ? dayNoon(deadline) : null;
  goal.color = color;
  await goal.save();
  return withHistory(goal);
}

export async function deleteGoal(userId, id) {
  const goal = await findOwned(userId, id);
  await goal.deleteOne();
  return { _id: goal._id };
}

// Adds money (amount > 0) or takes money out (amount < 0).
// One update does the check and the change together: the filter only matches while savedAmount >= -amount.
// For a deposit that is always true. For a withdrawal it fails when the goal holds less than the amount.
// Because MongoDB applies one update to a document at a time, two requests at the same moment can never
// both spend the same money, and $inc never loses an addition.
export async function addContribution(userId, id, { amount, note, date }) {
  const updated = await Goal.findOneAndUpdate(
    { _id: id, userId, savedAmount: { $gte: -amount } },
    {
      $inc: { savedAmount: amount },
      $push: { contributions: { amount, note, date: dayNoon(date ?? todayInVietnam()) } },
    },
    { returnDocument: "after" }
  );
  if (updated) return withHistory(updated);

  // No match: either the goal is not the user's (404) or the withdrawal is bigger than what was saved (400)
  await findOwned(userId, id);
  throw httpError(400, "You cannot withdraw more than the saved amount");
}

// Removes a contribution that was entered by mistake and takes its effect back.
// Again a single update: $inc and $pull happen together, and only if the entry still exists with this amount,
// so deleting the same entry twice at the same moment takes it back only once.
export async function removeContribution(userId, id, contributionId) {
  const goal = await findOwned(userId, id);
  const contribution = goal.contributions.id(contributionId);
  if (!contribution) throw httpError(404, "Contribution not found");

  // Taking back a deposit lowers savedAmount, so it needs savedAmount >= amount.
  // Taking back a withdrawal raises it, so the condition is always true.
  const updated = await Goal.findOneAndUpdate(
    {
      _id: id,
      userId,
      savedAmount: { $gte: contribution.amount },
      contributions: { $elemMatch: { _id: contribution._id, amount: contribution.amount } },
    },
    { $inc: { savedAmount: -contribution.amount }, $pull: { contributions: { _id: contribution._id } } },
    { returnDocument: "after" }
  );
  if (updated) return withHistory(updated);

  // No match: someone deleted it first (404), or the money of this deposit was already withdrawn (400)
  const current = await findOwned(userId, id);
  if (!current.contributions.id(contribution._id)) throw httpError(404, "Contribution not found");
  throw httpError(400, "Deleting this deposit would make the saved amount negative");
}
