// Vietnam is UTC+7 all year (no daylight saving)
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
// The same offset written the way MongoDB date operators expect it (e.g. $dateToString)
export const VIETNAM_TIMEZONE = "+07:00";

export const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

// The current month in Vietnam time, as "YYYY-MM"
export function currentMonth() {
  const vietnamNow = new Date(Date.now() + VIETNAM_OFFSET_MS);
  const month = String(vietnamNow.getUTCMonth() + 1).padStart(2, "0");
  return `${vietnamNow.getUTCFullYear()}-${month}`;
}

// "2026-10" -> { from: 2026-09-30T17:00Z, to: 2026-10-31T17:00Z }
// from is inclusive, to is exclusive (the 1st of the next month at 00:00 +07:00)
export function monthRange(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    from: new Date(Date.UTC(year, monthNumber - 1, 1) - VIETNAM_OFFSET_MS),
    to: new Date(Date.UTC(year, monthNumber, 1) - VIETNAM_OFFSET_MS),
  };
}

// shiftMonth("2026-03", -5) -> "2025-10". Date.UTC moves to the right year by itself.
export function shiftMonth(month, delta) {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
}
