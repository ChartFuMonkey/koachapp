import { test, expect } from "vitest";
import { isoDow, addDays, weekBounds, previousWeekStart } from "./week";

test("isoDow: Monday is 1, Sunday is 7", () => {
  expect(isoDow("2026-05-25")).toBe(1); // Monday
  expect(isoDow("2026-05-30")).toBe(6); // Saturday
  expect(isoDow("2026-05-31")).toBe(7); // Sunday
});

test("addDays handles month and year rollover", () => {
  expect(addDays("2026-05-31", 1)).toBe("2026-06-01");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28"); // 2026 not a leap year
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
});

test("weekBounds returns Monday..Sunday for any day in the week", () => {
  const expected = { weekStart: "2026-05-25", weekEnd: "2026-05-31" };
  expect(weekBounds("2026-05-25")).toEqual(expected); // Monday
  expect(weekBounds("2026-05-30")).toEqual(expected); // Saturday
  expect(weekBounds("2026-05-31")).toEqual(expected); // Sunday
});

test("previousWeekStart subtracts 7 days", () => {
  expect(previousWeekStart("2026-05-25")).toBe("2026-05-18");
});
