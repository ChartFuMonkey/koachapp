import { test, expect } from "vitest";
import { computeFlags } from "./flags";
import type { WeeklyMetrics } from "./types";

function metrics(over: Partial<WeeklyMetrics> = {}): WeeklyMetrics {
  const pair = { value: null, prev: null, target: null };
  return {
    daysLogged: 7,
    weight: { start: null, end: null, avg: null, changeKg: null, startWeightKg: null, targetWeightKg: null },
    calories: { ...pair }, protein: { ...pair }, carbs: { ...pair }, fat: { ...pair },
    steps: { ...pair }, sleepH: { ...pair }, sleepQuality: { ...pair }, energy: { ...pair }, waterL: { ...pair },
    cardioMin: 0, mealPlanAdherencePct: null,
    training: { sessionsDone: 3, sessionsPlanned: 4, totalVolumeKg: 0, totalDurationMin: 0, personalBests: [] },
    measurement: null, checkin: null, phase: null, daily: [],
    trends: { weightByWeek: [], measurements: [], strength: [] },
    ...over,
  };
}

test("flags low logging as danger when <=1 day", () => {
  const f = computeFlags(metrics({ daysLogged: 1 }));
  const low = f.find((x) => x.key === "low_logging");
  expect(low?.severity).toBe("danger");
});

test("flags missed training when zero sessions", () => {
  const f = computeFlags(metrics({ training: { sessionsDone: 0, sessionsPlanned: 4, totalVolumeKg: 0, totalDurationMin: 0, personalBests: [] } }));
  expect(f.some((x) => x.key === "missed_training")).toBe(true);
});

test("flags sleep when more than 1h under target", () => {
  const f = computeFlags(metrics({ sleepH: { value: 6, prev: null, target: 7.5 } }));
  expect(f.some((x) => x.key === "sleep_low")).toBe(true);
});

test("flags an open question from the check-in", () => {
  const f = computeFlags(metrics({ checkin: {
    overall: null, energy: null, stress: null, motivation: null, appetite: null,
    adherenceDietPct: null, adherenceTraining: null, whatWentWell: null, challenges: null,
    goalsNextWeek: null, questionsForCoach: "Can I swap deadlifts?",
  } }));
  expect(f.some((x) => x.key === "open_question")).toBe(true);
});

test("a clean week with full logging produces no warn/danger flags", () => {
  const f = computeFlags(metrics({ daysLogged: 7 }));
  expect(f.filter((x) => x.severity !== "info")).toHaveLength(0);
});
