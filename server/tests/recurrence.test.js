import { describe, expect, it } from "vitest";
import { firstRunDayFrom, nextRunDay } from "../src/utils/recurrence.js";

describe("nextRunDay", () => {
  it("adds 7 days for a weekly rule, across a month and a year", () => {
    expect(nextRunDay("weekly", "2026-10-01", "2026-10-01")).toBe("2026-10-08");
    expect(nextRunDay("weekly", "2026-10-01", "2026-10-29")).toBe("2026-11-05");
    expect(nextRunDay("weekly", "2026-12-28", "2026-12-28")).toBe("2027-01-04");
  });

  it("runs a monthly rule on the same day of the next month", () => {
    expect(nextRunDay("monthly", "2026-01-15", "2026-01-15")).toBe("2026-02-15");
    expect(nextRunDay("monthly", "2026-01-15", "2026-12-15")).toBe("2027-01-15");
  });

  it("uses the last day of a month that is too short", () => {
    expect(nextRunDay("monthly", "2027-01-31", "2027-01-31")).toBe("2027-02-28");
    expect(nextRunDay("monthly", "2027-01-30", "2027-01-30")).toBe("2027-02-28");
    expect(nextRunDay("monthly", "2027-01-29", "2027-01-29")).toBe("2027-02-28");
    expect(nextRunDay("monthly", "2026-08-31", "2026-08-31")).toBe("2026-09-30");
  });

  it("knows the leap year", () => {
    expect(nextRunDay("monthly", "2028-01-31", "2028-01-31")).toBe("2028-02-29");
  });

  it("goes back to the wanted day after a short month", () => {
    expect(nextRunDay("monthly", "2027-01-31", "2027-02-28")).toBe("2027-03-31");
    expect(nextRunDay("monthly", "2026-08-31", "2026-09-30")).toBe("2026-10-31");
  });
});

describe("firstRunDayFrom", () => {
  it("is the start day when fromDay is not later", () => {
    expect(firstRunDayFrom("monthly", "2026-10-15", "2026-10-15")).toBe("2026-10-15");
    expect(firstRunDayFrom("weekly", "2026-10-15", "2026-01-01")).toBe("2026-10-15");
  });

  it("walks the schedule up to fromDay", () => {
    expect(firstRunDayFrom("weekly", "2026-10-01", "2026-10-09")).toBe("2026-10-15");
    expect(firstRunDayFrom("monthly", "2027-01-31", "2027-03-01")).toBe("2027-03-31");
    expect(firstRunDayFrom("monthly", "2027-01-31", "2027-02-28")).toBe("2027-02-28");
  });
});
