// The schedule of a recurring rule, calculated on days written as "YYYY-MM-DD" (Vietnam time).
// Same format, so comparing the strings compares the days.

// The run after currentDay.
// A monthly rule always counts from the day of startDay, so 31 Jan -> 28 Feb -> 31 Mar (it does not stay on 28).
export function nextRunDay(frequency, startDay, currentDay) {
  const [year, monthNumber, dayNumber] = currentDay.split("-").map(Number);
  if (frequency === "weekly") {
    return new Date(Date.UTC(year, monthNumber - 1, dayNumber + 7)).toISOString().slice(0, 10);
  }

  // monthNumber is 1-12, so as a Date.UTC month (0-11) it already points to the next month.
  // Day 0 of the month after that is the last day of the next month.
  const lastDay = new Date(Date.UTC(year, monthNumber + 1, 0)).getUTCDate();
  const wantedDay = Number(startDay.slice(8));
  return new Date(Date.UTC(year, monthNumber, Math.min(wantedDay, lastDay))).toISOString().slice(0, 10);
}

// The first run of the schedule on or after fromDay (startDay itself when fromDay is earlier)
export function firstRunDayFrom(frequency, startDay, fromDay) {
  let day = startDay;
  while (day < fromDay) day = nextRunDay(frequency, startDay, day);
  return day;
}
