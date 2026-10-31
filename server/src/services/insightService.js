import { listBudgets } from "./budgetService.js";
import { loadMonthlyReport } from "./reportService.js";
import { currentMonth, monthProgress, todayInVietnam, vietnamDay } from "../utils/month.js";

// Insights are plain rules on the numbers of the month (no AI). Each one is { type, severity, message, code, params, link }.
// message is the English sentence; the client builds the sentence in the user's language from code and params.
const MAX_INSIGHTS = 6;
// A category must change by this many percent (up or down) from last month to be mentioned
const CATEGORY_CHANGE_PERCENT = 20;
// Budgets are in VND, so the budget rule only runs for VND reports
const BUDGET_CURRENCY = "VND";
// Savings rate (income - expense) / income: at or above this is "good"
const GOOD_SAVINGS_PERCENT = 20;
// This many days without spending is worth celebrating
const GOOD_NO_SPEND_DAYS = 5;
// At most this many budgets are mentioned
const MAX_BUDGET_INSIGHTS = 2;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
// warnings first, then good news, then neutral facts; used when more than 6 insights are found
const SEVERITY_ORDER = { warning: 0, success: 1, info: 2 };

// 1234567 -> "1.234.567 ₫" (like the client)
function money(amount) {
  return `${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} ₫`;
}

// "2026-10" -> "October 2026"
function monthName(month) {
  const [year, number] = month.split("-").map(Number);
  return `${MONTH_LONG_NAMES[number - 1]} ${year}`;
}

// "2026-10-05" -> "5 Oct"
function dayName(day) {
  const [, month, dayNumber] = day.split("-").map(Number);
  return `${dayNumber} ${MONTH_NAMES[month - 1]}`;
}

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

// Categories whose spending changed by 20% or more from last month: the one with the biggest increase
// and the one with the biggest decrease, measured in money (a +400% jump of 1.000 ₫ is not news)
function categoryInsights(month, categories) {
  const changed = categories.filter(
    (c) => c.changePercent !== null && Math.abs(c.changePercent) >= CATEGORY_CHANGE_PERCENT
  );
  const difference = (c) => c.total - c.previousTotal;
  const up = changed.filter((c) => difference(c) > 0).sort((a, b) => difference(b) - difference(a))[0];
  const down = changed.filter((c) => difference(c) < 0).sort((a, b) => difference(a) - difference(b))[0];

  const insights = [];
  if (up) {
    insights.push({
      type: "category-up",
      severity: "warning",
      message: `You spent ${money(difference(up))} (${up.changePercent}%) more on ${up.name} than last month.`,
      code: "CATEGORY_UP",
      params: { amount: difference(up), percent: up.changePercent, category: up.name },
      link: `/transactions?month=${month}&category=${up.categoryId}`,
    });
  }
  if (down) {
    insights.push({
      type: "category-down",
      severity: "success",
      message: `Nice! You spent ${money(-difference(down))} (${Math.abs(down.changePercent)}%) less on ${down.name} than last month.`,
      code: "CATEGORY_DOWN",
      params: { amount: -difference(down), percent: Math.abs(down.changePercent), category: down.name },
      link: `/transactions?month=${month}&category=${down.categoryId}`,
    });
  }
  return insights;
}

// Current month only: at the pace of spending so far, which budgets will be passed by the end of the month?
// projected = spent so far / days passed * days in the month
function budgetInsights(month, budgets, progress, today) {
  // A past month is over and a future month has no spending yet: there is nothing to forecast
  if (month !== today.slice(0, 7) || progress.elapsedDays === 0) return [];

  return budgets
    .map((b) => ({ ...b, projected: (b.spent / progress.elapsedDays) * progress.daysInMonth }))
    .filter((b) => b.projected > b.amount)
    .sort((a, b) => b.projected - b.amount - (a.projected - a.amount))
    .slice(0, MAX_BUDGET_INSIGHTS)
    .map((b) => ({
      type: "budget-forecast",
      severity: "warning",
      message:
        b.spent >= b.amount
          ? `You are already over your ${b.category.name} budget (${money(b.spent)} of ${money(b.amount)}).`
          : `At this pace you will spend about ${money(b.projected)} on ${b.category.name} by the end of the month, over your ${money(b.amount)} budget.`,
      code: b.spent >= b.amount ? "BUDGET_OVER" : "BUDGET_FORECAST",
      params: { spent: b.spent, budget: b.amount, projected: Math.round(b.projected), category: b.category.name },
      link: `/budgets?month=${month}`,
    }));
}

// Days without any expense. Only finished days count (see monthProgress).
function noSpendInsight(month, report, progress) {
  if (progress.completedDays === 0) return [];
  const days = report.noSpendDays;
  if (days === 0) {
    return [{
      type: "no-spend-days",
      severity: "info",
      message: `You spent money every day so far in ${monthName(month)}. Try a no-spend day.`,
      code: "NO_SPEND_NONE",
      params: { month },
      link: `/reports?tab=calendar&month=${month}`,
    }];
  }
  return [{
    type: "no-spend-days",
    severity: days >= GOOD_NO_SPEND_DAYS ? "success" : "info",
    message: `You had ${plural(days, "no-spend day")} in ${monthName(month)}.`,
    code: "NO_SPEND_DAYS",
    params: { count: days, month },
    link: `/reports?tab=calendar&month=${month}`,
  }];
}

// Savings rate = (income - expense) / income
function savingsInsight(month, report) {
  const { income, expense } = report.totals;
  const link = `/reports?tab=monthly&month=${month}`;
  if (income === 0) {
    if (expense === 0) return [];
    return [{
      type: "savings-rate",
      severity: "warning",
      message: `You spent ${money(expense)} but recorded no income in ${monthName(month)}.`,
      code: "SAVINGS_NO_INCOME",
      params: { amount: expense, month },
      link,
    }];
  }

  const rate = Math.round(((income - expense) / income) * 100);
  if (rate < 0) {
    return [{
      type: "savings-rate",
      severity: "warning",
      message: `You spent ${money(expense - income)} more than you earned in ${monthName(month)} (savings rate ${rate}%).`,
      code: "SAVINGS_NEGATIVE",
      params: { amount: expense - income, month, rate },
      link,
    }];
  }
  return [{
    type: "savings-rate",
    severity: rate >= GOOD_SAVINGS_PERCENT ? "success" : "info",
    message:
      rate >= GOOD_SAVINGS_PERCENT
        ? `Great! You saved ${rate}% of your income in ${monthName(month)}.`
        : `You saved ${rate}% of your income in ${monthName(month)}. Aim for ${GOOD_SAVINGS_PERCENT}% or more.`,
    code: rate >= GOOD_SAVINGS_PERCENT ? "SAVINGS_GOOD" : "SAVINGS_LOW",
    params: { rate, month, target: GOOD_SAVINGS_PERCENT },
    link,
  }];
}

function largestExpenseInsight(report) {
  const largest = report.largestExpense;
  if (!largest) return [];
  const day = vietnamDay(largest.date);
  return [{
    type: "largest-expense",
    severity: "info",
    message: `Your largest expense was ${money(largest.amount)} on ${largest.category.name} (${dayName(day)}).`,
    code: "LARGEST_EXPENSE",
    params: { amount: largest.amount, category: largest.category.name, day },
    link: `/transactions?from=${day}&to=${day}`,
  }];
}

// The rules, as a pure function of the numbers (so every rule can be tested with made-up numbers).
// Returns at most 6 insights, warnings first. A month without transactions has none.
// - report, categories: from loadMonthlyReport()
// - budgets: the month's budgets with `amount`, `spent` and `category.name` (from listBudgets), [] when unused
// - today: "YYYY-MM-DD" in Vietnam time
export function buildInsights({ month, report, categories, budgets, today }) {
  // Nothing was recorded: "31 days without spending" would only be noise
  if (report.totals.income === 0 && report.totals.expense === 0) return [];

  const progress = monthProgress(month, today);
  const found = [
    ...budgetInsights(month, budgets, progress, today),
    ...categoryInsights(month, categories),
    ...savingsInsight(month, report),
    ...noSpendInsight(month, report, progress),
    ...largestExpenseInsight(report),
  ];
  // sort() keeps the order of equal items, so the rules above stay in this order inside a severity
  return found.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]).slice(0, MAX_INSIGHTS);
}

export async function getInsights(userId, { month = currentMonth(), currency = "VND" }) {
  const today = todayInVietnam();
  const { report, categories } = await loadMonthlyReport(userId, { month, currency, today });
  // Budgets only matter while the month is running
  const budgets = month === currentMonth() && currency === BUDGET_CURRENCY ? await listBudgets(userId, { month }) : [];
  return { month, currency, insights: buildInsights({ month, report, categories, budgets, today }) };
}
