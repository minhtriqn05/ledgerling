// Number and date formatting shared by all pages.
// Amounts are VND integers; dates are shown in Vietnam time.

const vndNumber = new Intl.NumberFormat('vi-VN');
const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
const fullDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});

// 12450000 -> "12.450.000"
export function formatNumber(amount) {
  return vndNumber.format(amount);
}

// 12450000 -> "12.450.000 ₫" (non-breaking space, so the unit never wraps alone)
export function formatVnd(amount) {
  return `${vndNumber.format(amount)} ₫`;
}

// Adds "+" for income and "−" for expense: "+18.500.000 ₫"
export function formatSignedVnd(amount, type) {
  return `${type === 'income' ? '+' : '−'}${formatVnd(amount)}`;
}

// 13600000 -> "13.6M", 650000 -> "650K" (chart axes and small labels)
export function formatCompact(amount) {
  return compactNumber.format(amount);
}

// "2026-10-25" -> "25 Oct"
export function formatDayMonth(date) {
  return dayMonth.format(new Date(date));
}

// "2026-10-25" -> "25 Oct 2026"
export function formatDate(date) {
  return fullDate.format(new Date(date));
}
