import { test, expect } from "vitest";
import { computeMetrics, computeExerciseScorecard, type DailyLogRow, type ClientTargets, type ExerciseSetRow } from "./aggregate";

const targets: ClientTargets = {
  start_weight_kg: 90,
  target_weight_kg: 82,
  target_calories: 2200,
  target_protein_g: 180,
  target_carbs_g: 200,
  target_fat_g: 70,
  target_steps: 8000,
  target_sleep_h: 7.5,
};

function log(partial: Partial<DailyLogRow> & { log_date: string }): DailyLogRow {
  return {
    log_date: partial.log_date,
    weight_kg: partial.weight_kg ?? null,
    calories_kcal: partial.calories_kcal ?? null,
    protein_g: partial.protein_g ?? null,
    carbs_g: partial.carbs_g ?? null,
    fat_g: partial.fat_g ?? null,
    steps: partial.steps ?? null,
    cardio_min: partial.cardio_min ?? null,
    sleep_h: partial.sleep_h ?? null,
    sleep_quality: partial.sleep_quality ?? null,
    energy_level: partial.energy_level ?? null,
    water_l: partial.water_l ?? null,
    followed_meal_plan: partial.followed_meal_plan ?? null,
  };
}

const base = {
  targets,
  sessions: [],
  sessionsPlanned: 4,
  priorBests: {},
  exerciseNames: {},
  measurementThis: null,
  measurementPrev: null,
  checkin: null,
  phase: null,
};

test("counts logged days and averages calories vs target", () => {
  const m = computeMetrics({
    ...base,
    weekLogs: [
      log({ log_date: "2026-05-25", calories_kcal: 2000 }),
      log({ log_date: "2026-05-26", calories_kcal: 2400 }),
    ],
    prevLogs: [log({ log_date: "2026-05-18", calories_kcal: 1800 })],
  });
  expect(m.daysLogged).toBe(2);
  expect(m.calories.value).toBe(2200);
  expect(m.calories.prev).toBe(1800);
  expect(m.calories.target).toBe(2200);
});

test("weight change is end minus start within the week", () => {
  const m = computeMetrics({
    ...base,
    weekLogs: [
      log({ log_date: "2026-05-25", weight_kg: 89 }),
      log({ log_date: "2026-05-29", weight_kg: 88.2 }),
    ],
    prevLogs: [],
  });
  expect(m.weight.start).toBe(89);
  expect(m.weight.end).toBe(88.2);
  expect(m.weight.changeKg).toBe(-0.8);
});

test("meal plan adherence is percent of logged days that followed the plan", () => {
  const m = computeMetrics({
    ...base,
    weekLogs: [
      log({ log_date: "2026-05-25", followed_meal_plan: true }),
      log({ log_date: "2026-05-26", followed_meal_plan: true }),
      log({ log_date: "2026-05-27", followed_meal_plan: false }),
      log({ log_date: "2026-05-28" }), // null — excluded
    ],
    prevLogs: [],
  });
  expect(m.mealPlanAdherencePct).toBe(67); // 2 of 3
});

test("detects a personal best vs prior best", () => {
  const m = computeMetrics({
    ...base,
    weekLogs: [log({ log_date: "2026-05-25" })],
    prevLogs: [],
    sessions: [
      { durationMin: 60, sets: [
        { exercise_id: "ex1", reps: 5, weight_kg: 100 },
        { exercise_id: "ex1", reps: 5, weight_kg: 105 },
      ] },
    ],
    priorBests: { ex1: 102.5 },
    exerciseNames: { ex1: "Bench Press" },
  });
  expect(m.training.sessionsDone).toBe(1);
  expect(m.training.totalVolumeKg).toBe(1025); // 5*100 + 5*105
  expect(m.training.personalBests).toEqual([
    { exercise: "Bench Press", weightKg: 105, reps: 5 },
  ]);
});

test("daily series is sorted and trimmed to chart fields", () => {
  const m = computeMetrics({
    ...base,
    weekLogs: [
      log({ log_date: "2026-05-26", weight_kg: 88, calories_kcal: 2100, steps: 9000 }),
      log({ log_date: "2026-05-25", weight_kg: 89, calories_kcal: 2000, steps: 8000 }),
    ],
    prevLogs: [],
  });
  expect(m.daily.map((d) => d.date)).toEqual(["2026-05-25", "2026-05-26"]);
  expect(m.daily[0]).toEqual({ date: "2026-05-25", weightKg: 89, calories: 2000, steps: 8000, followedMealPlan: null });
});

test("exercise scorecard: top set, volume, e1RM, week-over-week delta, PR", () => {
  const thisWeekSets: ExerciseSetRow[] = [
    { exercise_id: "bench", reps: 5, weight_kg: 80 },
    { exercise_id: "bench", reps: 5, weight_kg: 85 }, // heaviest + best e1RM
    { exercise_id: "squat", reps: 5, weight_kg: 100 },
    { exercise_id: "plank", reps: 60, weight_kg: null }, // bodyweight: no weight/e1RM
  ];
  const lastWeekSets: ExerciseSetRow[] = [
    { exercise_id: "bench", reps: 5, weight_kg: 82 },
    { exercise_id: "squat", reps: 5, weight_kg: 100 },
  ];
  const out = computeExerciseScorecard({
    thisWeekSets,
    lastWeekSets,
    priorBests: { bench: 82.5, squat: 110 }, // bench is a PR (85 > 82.5); squat is not
    exerciseNames: { bench: "Bench", squat: "Squat", plank: "Plank" },
  });

  // sorted by volume desc: bench 825, squat 500, plank 0
  expect(out.map((r) => r.exercise)).toEqual(["Bench", "Squat", "Plank"]);

  const bench = out.find((r) => r.exercise === "Bench");
  expect(bench).toBeDefined();
  if (!bench) return;
  expect(bench.sets).toBe(2);
  expect(bench.topWeightKg).toBe(85);
  expect(bench.topReps).toBe(5);
  expect(bench.volumeKg).toBe(825);
  expect(bench.e1rmKg).toBe(Math.round(85 * (1 + 5 / 30))); // 99
  expect(bench.prevE1rmKg).toBe(Math.round(82 * (1 + 5 / 30))); // 96
  expect(bench.trainedLastWeek).toBe(true);
  expect(bench.isWeightPR).toBe(true);

  const squat = out.find((r) => r.exercise === "Squat");
  expect(squat?.isWeightPR).toBe(false); // 100 < prior 110

  const plank = out.find((r) => r.exercise === "Plank");
  expect(plank).toBeDefined();
  if (!plank) return;
  expect(plank.topWeightKg).toBeNull();
  expect(plank.e1rmKg).toBeNull();
  expect(plank.volumeKg).toBe(0);
  expect(plank.trainedLastWeek).toBe(false);
  expect(plank.isWeightPR).toBe(false);
});
