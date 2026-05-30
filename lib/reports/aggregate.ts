// lib/reports/aggregate.ts
// Pure metric computation (no I/O). The orchestrator fetches rows and passes
// them in; this module only does math so it can be unit-tested.

import type { WeeklyMetrics, MetricPair, CheckinEcho, PhaseInfo } from "./types";

export type DailyLogRow = {
  log_date: string;
  weight_kg: number | null;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  steps: number | null;
  cardio_min: number | null;
  sleep_h: number | null;
  sleep_quality: number | null;
  energy_level: number | null;
  water_l: number | null;
  followed_meal_plan: boolean | null;
};

export type ClientTargets = {
  start_weight_kg: number | null;
  target_weight_kg: number | null;
  target_calories: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  target_steps: number | null;
  target_sleep_h: number | null;
};

export type ExerciseSetRow = {
  exercise_id: string;
  reps: number | null;
  weight_kg: number | null;
};

export type SessionAgg = {
  durationMin: number | null;
  sets: ExerciseSetRow[];
};

export type MeasurementRow = {
  waist_cm: number | null;
  body_fat_pct: number | null;
} | null;

function avg(nums: Array<number | null | undefined>): number | null {
  const vals = nums.filter((n): n is number => typeof n === "number");
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function round(n: number | null, dp = 1): number | null {
  if (n == null) return null;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function computeMetrics(input: {
  weekLogs: DailyLogRow[];
  prevLogs: DailyLogRow[];
  targets: ClientTargets;
  sessions: SessionAgg[];
  sessionsPlanned: number | null;
  priorBests: Record<string, number>;
  exerciseNames: Record<string, string>;
  measurementThis: MeasurementRow;
  measurementPrev: MeasurementRow;
  checkin: CheckinEcho | null;
  phase: PhaseInfo | null;
}): WeeklyMetrics {
  const { weekLogs, prevLogs, targets, sessions } = input;

  // ── Weight ──────────────────────────────────────────────
  const sortedWeight = weekLogs
    .filter((l) => l.weight_kg != null)
    .sort((a, b) => a.log_date.localeCompare(b.log_date));
  const startW = sortedWeight[0]?.weight_kg ?? null;
  const endW = sortedWeight[sortedWeight.length - 1]?.weight_kg ?? null;

  const prevSortedWeight = prevLogs
    .filter((l) => l.weight_kg != null)
    .sort((a, b) => a.log_date.localeCompare(b.log_date));
  const prevEndW =
    prevSortedWeight[prevSortedWeight.length - 1]?.weight_kg ?? null;

  let changeKg: number | null = null;
  if (startW != null && endW != null && sortedWeight.length >= 2) {
    changeKg = round(endW - startW, 2);
  } else if (endW != null && prevEndW != null) {
    changeKg = round(endW - prevEndW, 2);
  }

  // ── Meal plan adherence ─────────────────────────────────
  const planDays = weekLogs.filter((l) => l.followed_meal_plan != null);
  const followed = planDays.filter((l) => l.followed_meal_plan === true);
  const mealPlanAdherencePct =
    planDays.length > 0
      ? Math.round((followed.length / planDays.length) * 100)
      : null;

  // ── Training ────────────────────────────────────────────
  const allSets = sessions.flatMap((s) => s.sets);
  const totalVolumeKg = allSets.reduce(
    (sum, st) => sum + (st.reps ?? 0) * (st.weight_kg ?? 0),
    0
  );
  const totalDurationMin = sessions.reduce(
    (s, x) => s + (x.durationMin ?? 0),
    0
  );

  const maxThisWeek: Record<string, { weight: number; reps: number }> = {};
  for (const st of allSets) {
    if (st.weight_kg == null) continue;
    const cur = maxThisWeek[st.exercise_id];
    if (!cur || st.weight_kg > cur.weight) {
      maxThisWeek[st.exercise_id] = {
        weight: st.weight_kg,
        reps: st.reps ?? 0,
      };
    }
  }
  const personalBests = Object.entries(maxThisWeek)
    .filter(([exId, m]) => m.weight > (input.priorBests[exId] ?? 0))
    .map(([exId, m]) => ({
      exercise: input.exerciseNames[exId] ?? "Exercise",
      weightKg: m.weight,
      reps: m.reps,
    }));

  // ── MetricPair helper ───────────────────────────────────
  const pair = (
    selector: (l: DailyLogRow) => number | null,
    target: number | null
  ): MetricPair => ({
    value: round(avg(weekLogs.map(selector))),
    prev: round(avg(prevLogs.map(selector))),
    target,
  });

  return {
    daysLogged: weekLogs.length,
    weight: {
      start: startW,
      end: endW,
      avg: round(avg(weekLogs.map((l) => l.weight_kg))),
      changeKg,
      startWeightKg: targets.start_weight_kg,
      targetWeightKg: targets.target_weight_kg,
    },
    calories: pair((l) => l.calories_kcal, targets.target_calories),
    protein: pair((l) => l.protein_g, targets.target_protein_g),
    carbs: pair((l) => l.carbs_g, targets.target_carbs_g),
    fat: pair((l) => l.fat_g, targets.target_fat_g),
    steps: pair((l) => l.steps, targets.target_steps),
    sleepH: pair((l) => l.sleep_h, targets.target_sleep_h),
    sleepQuality: pair((l) => l.sleep_quality, null),
    energy: pair((l) => l.energy_level, null),
    waterL: pair((l) => l.water_l, null),
    cardioMin: weekLogs.reduce((s, l) => s + (l.cardio_min ?? 0), 0),
    mealPlanAdherencePct,
    training: {
      sessionsDone: sessions.length,
      sessionsPlanned: input.sessionsPlanned,
      totalVolumeKg: round(totalVolumeKg, 0),
      totalDurationMin,
      personalBests,
    },
    measurement: input.measurementThis
      ? {
          waistCm: input.measurementThis.waist_cm,
          waistPrevCm: input.measurementPrev?.waist_cm ?? null,
          bodyFatPct: input.measurementThis.body_fat_pct,
          bodyFatPrevPct: input.measurementPrev?.body_fat_pct ?? null,
        }
      : null,
    checkin: input.checkin,
    phase: input.phase,
    daily: [...weekLogs]
      .sort((a, b) => a.log_date.localeCompare(b.log_date))
      .map((l) => ({
        date: l.log_date,
        weightKg: l.weight_kg,
        calories: l.calories_kcal,
        steps: l.steps,
      })),
  };
}
