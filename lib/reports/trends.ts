// lib/reports/trends.ts
// Pure multi-week trend computation for report progress graphs.
import { weekBounds, addDays } from "./week";
import type { Trends, TrendPoint } from "./types";

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeTrends(input: {
  weekStart: string;
  weeksBack?: number;
  dailyHistory: { log_date: string; weight_kg: number | null }[];
  measHistory: { meas_date: string; waist_cm: number | null; body_fat_pct: number | null }[];
  strengthHistory: { session_date: string; exercise_id: string; weight_kg: number | null }[];
  exerciseNames: Record<string, string>;
}): Trends {
  const weeksBack = input.weeksBack ?? 12;
  const windowStart = addDays(input.weekStart, -7 * (weeksBack - 1));
  const inWindow = (ws: string) => ws >= windowStart && ws <= input.weekStart;

  // ── weightByWeek ─────────────────────────────────────────
  const wBuckets = new Map<string, number[]>();
  for (const r of input.dailyHistory) {
    if (r.weight_kg == null) continue;
    const ws = weekBounds(r.log_date).weekStart;
    if (!inWindow(ws)) continue;
    const arr = wBuckets.get(ws);
    if (arr) arr.push(r.weight_kg);
    else wBuckets.set(ws, [r.weight_kg]);
  }
  const weightByWeek: TrendPoint[] = [...wBuckets.entries()]
    .map(([weekStart, vals]) => ({ weekStart, value: round1(avg(vals)) }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  // ── measurements ─────────────────────────────────────────
  const measurements = [...input.measHistory]
    .sort((a, b) => a.meas_date.localeCompare(b.meas_date))
    .slice(-8)
    .map((m) => ({ date: m.meas_date, waistCm: m.waist_cm, bodyFatPct: m.body_fat_pct }));

  // ── strength (top-4 most-tracked lifts) ──────────────────
  const byEx = new Map<string, Map<string, number>>();
  for (const s of input.strengthHistory) {
    if (s.weight_kg == null) continue;
    const ws = weekBounds(s.session_date).weekStart;
    if (!inWindow(ws)) continue;
    let wk = byEx.get(s.exercise_id);
    if (!wk) { wk = new Map(); byEx.set(s.exercise_id, wk); }
    wk.set(ws, Math.max(wk.get(ws) ?? 0, s.weight_kg));
  }
  const strength = [...byEx.entries()]
    .map(([exId, wk]) => ({
      exercise: input.exerciseNames[exId] ?? "Exercise",
      points: [...wk.entries()]
        .map(([weekStart, value]) => ({ weekStart, value }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    }))
    .filter((s) => s.points.length >= 2)
    .sort((a, b) => b.points.length - a.points.length)
    .slice(0, 4);

  return { weightByWeek, measurements, strength };
}
