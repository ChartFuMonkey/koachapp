import { test, expect } from "vitest";
import { computeTrends } from "./trends";

const base = {
  weekStart: "2026-05-25",
  weeksBack: 12,
  exerciseNames: { ex1: "Bench", ex2: "Squat", ex3: "Curl" },
};

test("weightByWeek buckets daily weights into ISO weeks, oldest→newest", () => {
  const t = computeTrends({
    ...base,
    dailyHistory: [
      { log_date: "2026-05-18", weight_kg: 87 },
      { log_date: "2026-05-20", weight_kg: 86.6 }, // same week → avg 86.8
      { log_date: "2026-05-25", weight_kg: 86.2 },
      { log_date: "2026-05-27", weight_kg: 85.8 }, // avg 86.0
    ],
    measHistory: [],
    strengthHistory: [],
  });
  expect(t.weightByWeek).toEqual([
    { weekStart: "2026-05-18", value: 86.8 },
    { weekStart: "2026-05-25", value: 86 },
  ]);
});

test("strength: weekly top set per lift, top-4 by weeks, drops <2-week lifts", () => {
  const t = computeTrends({
    ...base,
    dailyHistory: [],
    measHistory: [],
    strengthHistory: [
      { session_date: "2026-05-18", exercise_id: "ex1", weight_kg: 80 },
      { session_date: "2026-05-18", exercise_id: "ex1", weight_kg: 82 }, // wk1 max 82
      { session_date: "2026-05-25", exercise_id: "ex1", weight_kg: 85 }, // wk2 max 85
      { session_date: "2026-05-25", exercise_id: "ex2", weight_kg: 110 }, // only 1 week → dropped
    ],
  });
  expect(t.strength).toEqual([
    { exercise: "Bench", points: [
      { weekStart: "2026-05-18", value: 82 },
      { weekStart: "2026-05-25", value: 85 },
    ] },
  ]);
});

test("measurements sorted ascending and capped to last 8", () => {
  const measHistory = Array.from({ length: 10 }, (_, i) => ({
    meas_date: `2026-03-${String(i + 1).padStart(2, "0")}`,
    waist_cm: 95 - i,
    body_fat_pct: 20 - i * 0.2,
  }));
  const t = computeTrends({ ...base, dailyHistory: [], strengthHistory: [], measHistory });
  expect(t.measurements).toHaveLength(8);
  expect(t.measurements[0].date).toBe("2026-03-03"); // first two dropped (kept last 8)
  expect(t.measurements[7].date).toBe("2026-03-10");
});
