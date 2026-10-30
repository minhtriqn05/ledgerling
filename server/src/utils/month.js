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

// A calendar day like "2026-10-15"
export const DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// false for days that do not exist like "2026-02-30" (Date.UTC would quietly turn it into March 2nd)
export function isValidDay(day) {
  if (!DAY_REGEX.test(day)) return false;
  const [year, monthNumber, dayNumber] = day.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, dayNumber)).toISOString().slice(0, 10) === day;
}

// "2026-10-15" -> 2026-10-14T17:00Z (00:00 of that day in Vietnam time)
export function dayStart(day) {
  const [year, monthNumber, dayNumber] = day.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, dayNumber) - VIETNAM_OFFSET_MS);
}

// "2026-10-15" -> 2026-10-15T17:00Z (00:00 of the next day in Vietnam time), used as an exclusive end
export function nextDayStart(day) {
  const [year, monthNumber, dayNumber] = day.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, dayNumber + 1) - VIETNAM_OFFSET_MS);
}

// "2026-10-15" -> 2026-10-15T05:00Z (12:00 of that day in Vietnam time, like the dates from the Transactions form)
export function dayNoon(day) {
  const [year, monthNumber, dayNumber] = day.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, dayNumber, 12) - VIETNAM_OFFSET_MS);
}

// A moment as its day in Vietnam time: 2026-10-14T17:00Z -> "2026-10-15"
export function vietnamDay(date) {
  return new Date(date.getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
}

// Today in Vietnam time, as "YYYY-MM-DD"
export function todayInVietnam() {
  return vietnamDay(new Date());
}

// A moment as "YYYY-MM-DD HH:mm" in Vietnam time: 2026-10-27T05:30Z -> "2026-10-27 12:30"
export function formatVietnamDateTime(date) {
  return new Date(date.getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 16).replace("T", " ");
}

// shiftMonth("2026-03", -5) -> "2025-10". Date.UTC moves to the right year by itself.
export function shiftMonth(month, delta) {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
}
