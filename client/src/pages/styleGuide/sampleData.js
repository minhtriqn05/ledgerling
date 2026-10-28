// Fake data for the style guide previews. Amounts are VND.
// The real pages will get these numbers from the API.

export const user = { name: 'Minh Anh', initials: 'MA', email: 'minhanh@example.com' };

// The 8 preset category colors, in the fixed order from tokens.css.
// count / amount = this month's transactions in the category.
export const categories = [
  { id: 'rent', name: 'Rent', type: 'expense', color: '--chart-1', count: 1, amount: 4500000 },
  { id: 'food', name: 'Food', type: 'expense', color: '--chart-2', count: 24, amount: 3800000 },
  { id: 'bills', name: 'Bills', type: 'expense', color: '--chart-3', count: 4, amount: 1700000 },
  { id: 'shopping', name: 'Shopping', type: 'expense', color: '--chart-4', count: 3, amount: 1500000 },
  { id: 'transport', name: 'Transport', type: 'expense', color: '--chart-5', count: 9, amount: 1200000 },
  { id: 'health', name: 'Health', type: 'expense', color: '--chart-6', count: 2, amount: 900000 },
  { id: 'freelance', name: 'Freelance', type: 'income', color: '--chart-7', count: 1, amount: 3000000 },
  { id: 'salary', name: 'Salary', type: 'income', color: '--chart-8', count: 1, amount: 18500000 },
];

const colorOf = (name) => categories.find((c) => c.name === name).color;

export const summary = {
  balance: 12450000,
  balanceChange: 8.2, // % vs last month
  income: 21500000,
  incomeChange: 12,
  expense: 13600000,
  expenseChange: -5,
  transactionCount: 45,
};

// Balance at the end of each week (million ₫), only used for the sparkline shape.
export const balanceTrend = [7.2, 7.8, 7.5, 8.6, 8.9, 8.4, 9.8, 10.4, 10.1, 11.3, 11.9, 12.45].map(
  (value, index) => ({ index, value })
);

export const cashflow = [
  { month: 'May', income: 18500000, expense: 12100000 },
  { month: 'Jun', income: 18500000, expense: 14800000 },
  { month: 'Jul', income: 21000000, expense: 13200000 },
  { month: 'Aug', income: 18500000, expense: 16400000 },
  { month: 'Sep', income: 19200000, expense: 11900000 },
  { month: 'Oct', income: 21500000, expense: 13600000 },
];

// This month's expenses per category (adds up to summary.expense).
export const spendingByCategory = categories.filter((c) => c.type === 'expense');

export const weeklySpending = [
  { day: 'Mon', label: 'Monday', amount: 120000 },
  { day: 'Tue', label: 'Tuesday', amount: 340000 },
  { day: 'Wed', label: 'Wednesday', amount: 95000 },
  { day: 'Thu', label: 'Thursday', amount: 210000 },
  { day: 'Fri', label: 'Friday', amount: 650000 },
  { day: 'Sat', label: 'Saturday', amount: 280000 },
  { day: 'Sun', label: 'Sunday', amount: 160000 },
];

export const transactions = [
  { id: 1, date: '2026-10-25', note: 'Lunch with team', category: 'Food', type: 'expense', amount: 185000 },
  { id: 2, date: '2026-10-25', note: 'Coffee with Lan', category: 'Food', type: 'expense', amount: 45000 },
  { id: 3, date: '2026-10-24', note: 'October salary', category: 'Salary', type: 'income', amount: 18500000 },
  { id: 4, date: '2026-10-22', note: 'Grab to campus', category: 'Transport', type: 'expense', amount: 42000 },
  { id: 5, date: '2026-10-20', note: 'Electricity bill', category: 'Bills', type: 'expense', amount: 650000 },
  { id: 6, date: '2026-10-19', note: 'Pharmacy', category: 'Health', type: 'expense', amount: 120000 },
  { id: 7, date: '2026-10-18', note: 'Freelance design', category: 'Freelance', type: 'income', amount: 3000000 },
  { id: 8, date: '2026-10-15', note: 'New sneakers', category: 'Shopping', type: 'expense', amount: 890000 },
].map((t) => ({ ...t, color: colorOf(t.category) }));

export const recentTransactions = transactions.slice(0, 5);
