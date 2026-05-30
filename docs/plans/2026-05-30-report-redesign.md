# Weekly Report Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the weekly report into sectioned UI (Nutrition / Training / Progress) with four progress graphs + PDF download, and let the coach add three recommendations (Training / Nutrition / General) at review time.

**Architecture:** Extend the generated `metrics` snapshot with multi-week `trends` (computed by a new pure `lib/reports/trends.ts`). Add three coach-recommendation columns. Replace the flat `report-metrics.tsx` with a composable `ReportView` (hero + 3 sections + focused chart/part components + a client-side PDF button). The review form gains three recommendation inputs.

**Tech Stack:** Next.js 16 (RSC + server actions), Supabase (jsonb metrics + 3 new text columns), recharts, `html2canvas` + `jspdf` (client-side PDF), next-intl (hr/en), vitest.

**Reference spec:** `docs/plans/2026-05-30-report-redesign-design.md`. Builds on the shipped feature in `docs/plans/2026-05-30-weekly-reports.md`.

---

## Conventions (already in this codebase)

- Pure tested core in `lib/reports/{week,aggregate,flags}.ts` (vitest, `pool: "forks"`). New `trends.ts` follows the same pattern.
- `WeeklyReportRow`/`WeeklyMetrics` types live in `lib/reports/types.ts`.
- Charts use the `tooltipStyle` / `axisTickStyle` objects and CSS-var colors (`var(--lime)`, `var(--carb)`, `var(--violet)`, `var(--ink-3)`, `var(--hairline)`); tone colors via `lib/metric-direction.ts`.
- Styling: `bg-card`, `border-border`, `text-ink`/`text-ink-2`/`text-ink-3`, mono micro-labels (`font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3`).
- i18n: add keys to BOTH `messages/en.json` and `messages/hr.json`.
- `npx tsc --noEmit`, `npx vitest run`, `npx eslint <paths>` are the checks. The local `next dev` does not bind in this environment — verify UI on a Vercel **preview** deploy (push branch → PR → preview URL).

## File structure (created / modified)

**Created**
- `supabase/migrations/20260530_report_recommendations.sql` — 3 rec columns
- `lib/reports/trends.ts` (+ `trends.test.ts`) — pure `computeTrends`
- `components/reports/report-parts.tsx` — SectionHeader, StatCard, GoalProgressBar, AdherenceDots, PersonalBests, RecommendationBlock
- `components/reports/report-charts.tsx` — WeightTrendChart, StrengthChart, MeasurementsChart, MacroBars, CaloriesChart, StepsChart
- `components/reports/nutrition-section.tsx`, `training-section.tsx`, `progress-section.tsx`
- `components/reports/report-view.tsx` — composes the whole report
- `components/reports/download-pdf-button.tsx` — PDF export

**Modified**
- `lib/reports/types.ts` — `TrendPoint`, `Trends`, `DailyPoint.followedMealPlan`, `WeeklyMetrics.trends`, `WeeklyReportRow` rec fields
- `lib/reports/aggregate.ts` (+ `aggregate.test.ts`) — add `followedMealPlan` to `daily`
- `lib/reports/generate.ts` — fetch history, call `computeTrends`
- `actions/reports.ts` — `releaseReport` saves the 3 recs
- `app/coach/reports/[id]/review-form.tsx` — 3 recommendation textareas + render `ReportView`
- `app/app/reports/[id]/page.tsx` — render `ReportView`
- `messages/en.json`, `messages/hr.json` — new keys
- `package.json` — `html2canvas`, `jspdf`

**Removed**
- `components/reports/report-metrics.tsx` (superseded by `ReportView` + sections)

---

## Task 1: DB migration — recommendation columns

**Files:** Create `supabase/migrations/20260530_report_recommendations.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Coach-authored recommendations on a weekly report (filled at review time).
ALTER TABLE weekly_reports
  ADD COLUMN IF NOT EXISTS rec_training text,
  ADD COLUMN IF NOT EXISTS rec_nutrition text,
  ADD COLUMN IF NOT EXISTS rec_general text;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use the Supabase MCP `apply_migration` tool, `project_id` `zyjwkdsulzosfuadnnwq`, name `report_recommendations`, with the SQL above.

- [ ] **Step 3: Verify**

Supabase MCP `execute_sql`:
```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='weekly_reports'
and column_name in ('rec_training','rec_nutrition','rec_general') order by column_name;
```
Expected: 3 rows.

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/20260530_report_recommendations.sql
git commit -m "feat(reports): add coach recommendation columns"
```

---

## Task 2: Dependencies — html2canvas + jspdf

**Files:** Modify `package.json` (via npm)

- [ ] **Step 1: Install**

Run: `npm install html2canvas jspdf`
Expected: both added to `dependencies`, no errors.

- [ ] **Step 2: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore(reports): add html2canvas + jspdf for PDF export"
```

---

## Task 3: Types — trends + recommendations

**Files:** Modify `lib/reports/types.ts`

- [ ] **Step 1: Add trend types + extend DailyPoint**

Replace the existing `DailyPoint` type with:
```ts
export type DailyPoint = {
  date: string; // YYYY-MM-DD
  weightKg: number | null;
  calories: number | null;
  steps: number | null;
  followedMealPlan: boolean | null;
};

export type TrendPoint = { weekStart: string; value: number };

export type Trends = {
  weightByWeek: TrendPoint[];
  measurements: Array<{ date: string; waistCm: number | null; bodyFatPct: number | null }>;
  strength: Array<{ exercise: string; points: TrendPoint[] }>;
};
```

- [ ] **Step 2: Add `trends` to `WeeklyMetrics`**

In the `WeeklyMetrics` type, add after `daily`:
```ts
  trends: Trends;
```

- [ ] **Step 3: Add rec fields to `WeeklyReportRow`**

In `WeeklyReportRow`, add after `coach_note`:
```ts
  rec_training: string | null;
  rec_nutrition: string | null;
  rec_general: string | null;
```

- [ ] **Step 4: Typecheck (will fail until aggregate/trends updated — expected)**

Run: `npx tsc --noEmit`
Expected: errors in `aggregate.ts`, `generate.ts`, and `flags.test.ts` (missing `followedMealPlan`/`trends`) — fixed in Tasks 4–6.

- [ ] **Step 5: Commit**
```bash
git add lib/reports/types.ts
git commit -m "feat(reports): trend + recommendation types"
```

---

## Task 4: aggregate.ts — add followedMealPlan to daily

**Files:** Modify `lib/reports/aggregate.ts`, `lib/reports/aggregate.test.ts`

- [ ] **Step 1: Update the failing test**

In `aggregate.test.ts`, find the test `"daily series is sorted and trimmed to chart fields"` and replace its final assertion block with:
```ts
  expect(m.daily.map((d) => d.date)).toEqual(["2026-05-25", "2026-05-26"]);
  expect(m.daily[0]).toEqual({
    date: "2026-05-25", weightKg: 89, calories: 2000, steps: 8000, followedMealPlan: null,
  });
```

Also, in `lib/reports/flags.test.ts`, the `metrics()` helper builds a full `WeeklyMetrics` literal — add `trends: { weightByWeek: [], measurements: [], strength: [] },` to it (right after `daily: [],`) so it satisfies the updated type.

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx vitest run lib/reports/aggregate.test.ts`
Expected: FAIL (missing `followedMealPlan`).

- [ ] **Step 3: Implement**

In `aggregate.ts`, the `daily:` mapping at the end of `computeMetrics` returns objects `{ date, weightKg, calories, steps }`. Change the map callback to:
```ts
      .map((l) => ({
        date: l.log_date,
        weightKg: l.weight_kg,
        calories: l.calories_kcal,
        steps: l.steps,
        followedMealPlan: l.followed_meal_plan,
      })),
```
The returned object is **missing** `trends` now (type error) — `computeMetrics` does not own trends. Fix by NOT adding trends here; instead the orchestrator attaches it. To keep `computeMetrics` returning a valid `WeeklyMetrics`, add `trends: { weightByWeek: [], measurements: [], strength: [] }` to the returned object (a default the orchestrator overwrites). Add this line in the returned object (e.g. right after `daily: ...`):
```ts
    trends: { weightByWeek: [], measurements: [], strength: [] },
```

- [ ] **Step 4: Run it — expect PASS**

Run: `npx vitest run lib/reports/aggregate.test.ts`
Expected: PASS (all aggregate tests green).

- [ ] **Step 5: Commit**
```bash
git add lib/reports/aggregate.ts lib/reports/aggregate.test.ts
git commit -m "feat(reports): carry meal-plan flag in daily points"
```

---

## Task 5: trends.ts — pure computeTrends (TDD)

**Files:** Create `lib/reports/trends.ts`, `lib/reports/trends.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/reports/trends.test.ts`:
```ts
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
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run lib/reports/trends.test.ts`
Expected: FAIL — cannot resolve `./trends`.

- [ ] **Step 3: Implement**

`lib/reports/trends.ts`:
```ts
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
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run lib/reports/trends.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**
```bash
git add lib/reports/trends.ts lib/reports/trends.test.ts
git commit -m "feat(reports): pure multi-week trend computation"
```

---

## Task 6: generate.ts — fetch history + attach trends

**Files:** Modify `lib/reports/generate.ts`

- [ ] **Step 1: Import computeTrends**

At the top with the other `./` imports, add:
```ts
import { computeTrends } from "./trends";
```

- [ ] **Step 2: Fetch history + build exercise-name map for trends**

In `generateReportForClient`, AFTER the existing `metrics` is computed by `computeMetrics(...)` and BEFORE `const flags = computeFlags(metrics);`, insert:
```ts
  // ── Multi-week history for progress trends ───────────────
  const trendWindowStart = addDays(weekStart, -7 * 11); // 12 weeks incl. current
  const [{ data: weightHistory }, { data: measHistoryRows }, { data: strengthSessions }] =
    await Promise.all([
      supabaseAdmin
        .from("daily_logs")
        .select("log_date, weight_kg")
        .eq("client_id", clientId)
        .gte("log_date", trendWindowStart)
        .lte("log_date", weekEnd),
      supabaseAdmin
        .from("measurements")
        .select("meas_date, waist_cm, body_fat_pct")
        .eq("client_id", clientId)
        .order("meas_date", { ascending: false })
        .limit(8),
      supabaseAdmin
        .from("workout_sessions")
        .select("session_date, exercise_logs(exercise_id, weight_kg)")
        .eq("client_id", clientId)
        .gte("session_date", trendWindowStart)
        .lte("session_date", weekEnd),
    ]);

  const strengthHistory = (strengthSessions ?? []).flatMap((s) => {
    const date = (s as { session_date: string }).session_date;
    const logs = (s as { exercise_logs: { exercise_id: string; weight_kg: number | null }[] }).exercise_logs ?? [];
    return logs.map((e) => ({ session_date: date, exercise_id: e.exercise_id, weight_kg: e.weight_kg }));
  });

  // Names for any exercise in the trend window (superset of the PR map).
  const trendExerciseIds = [...new Set(strengthHistory.map((s) => s.exercise_id))];
  const trendExerciseNames: Record<string, string> = { ...exerciseNames };
  const missing = trendExerciseIds.filter((eid) => !(eid in trendExerciseNames));
  if (missing.length > 0) {
    const { data: exRows2 } = await supabaseAdmin
      .from("exercises").select("id, name").in("id", missing);
    for (const ex of exRows2 ?? []) trendExerciseNames[ex.id as string] = ex.name as string;
  }

  metrics.trends = computeTrends({
    weekStart,
    dailyHistory: (weightHistory ?? []) as { log_date: string; weight_kg: number | null }[],
    measHistory: (measHistoryRows ?? []) as { meas_date: string; waist_cm: number | null; body_fat_pct: number | null }[],
    strengthHistory,
    exerciseNames: trendExerciseNames,
  });
```

> `addDays` and `exerciseNames` are already imported/defined earlier in this file (`addDays` from `./week`; `exerciseNames` built for the PR calc).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (types now satisfied end-to-end).

- [ ] **Step 4: Commit**
```bash
git add lib/reports/generate.ts
git commit -m "feat(reports): compute + attach multi-week trends at generation"
```

---

## Task 7: actions/reports.ts — save recommendations on release

**Files:** Modify `actions/reports.ts`

- [ ] **Step 1: Extend `releaseReport` signature + update**

In `releaseReport`, change the `payload` param type to include the recs, and add them to the `.update({...})`:
```ts
export async function releaseReport(
  reportId: string,
  payload: {
    clientSummary: string;
    coachNote: string;
    recTraining: string;
    recNutrition: string;
    recGeneral: string;
  }
): Promise<{ success?: true; error?: string }> {
```
And in the `.update({ ... })` object add:
```ts
      rec_training: payload.recTraining,
      rec_nutrition: payload.recNutrition,
      rec_general: payload.recGeneral,
```
(Keep the existing `client_summary`, `coach_note`, `status`, `published_at`, `updated_at` fields.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: error in `review-form.tsx` (callsite passes old payload) — fixed in Task 14. No error in `actions/reports.ts`.

- [ ] **Step 3: Commit**
```bash
git add actions/reports.ts
git commit -m "feat(reports): persist coach recommendations on release"
```

---

## Task 8: i18n — new report keys

**Files:** Modify `messages/en.json`, `messages/hr.json`

- [ ] **Step 1: Add keys under the existing `reports` namespace (en.json)**

Merge these into the `reports` object in `messages/en.json` (alongside the existing keys; do not remove existing ones):
```json
"sections": { "nutrition": "Nutrition", "training": "Training", "progress": "Progress" },
"goalProgress": "Goal progress",
"goalStart": "Start", "goalNow": "Now", "goalTarget": "Goal",
"adherence7d": "Meal-plan days",
"weightTrend": "Weight trend", "strengthTrend": "Strength progression",
"measurementsTrend": "Body measurements", "waist": "Waist", "bodyFat": "Body fat",
"macros": "Macros vs target",
"recommendations": "Coach's recommendations",
"recTraining": "Training", "recNutrition": "Nutrition", "recGeneral": "General",
"recTrainingPlaceholder": "Training advice for next week…",
"recNutritionPlaceholder": "Nutrition advice for next week…",
"recGeneralPlaceholder": "General message / focus for next week…",
"downloadPdf": "Download PDF",
"generatedOn": "Generated {date}"
```

- [ ] **Step 2: Add the same keys (Croatian) to hr.json**

Merge into the `reports` object in `messages/hr.json`:
```json
"sections": { "nutrition": "Prehrana", "training": "Trening", "progress": "Napredak" },
"goalProgress": "Napredak prema cilju",
"goalStart": "Početak", "goalNow": "Sada", "goalTarget": "Cilj",
"adherence7d": "Dani na planu",
"weightTrend": "Trend težine", "strengthTrend": "Napredak snage",
"measurementsTrend": "Tjelesne mjere", "waist": "Struk", "bodyFat": "Masno tkivo",
"macros": "Makronutrijenti vs cilj",
"recommendations": "Preporuke trenera",
"recTraining": "Trening", "recNutrition": "Prehrana", "recGeneral": "Općenito",
"recTrainingPlaceholder": "Savjeti za trening sljedeći tjedan…",
"recNutritionPlaceholder": "Savjeti za prehranu sljedeći tjedan…",
"recGeneralPlaceholder": "Općenita poruka / fokus za sljedeći tjedan…",
"downloadPdf": "Preuzmi PDF",
"generatedOn": "Generirano {date}"
```

- [ ] **Step 3: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json'));JSON.parse(require('fs').readFileSync('messages/hr.json'));console.log('ok')"`
Expected: `ok`.

- [ ] **Step 4: Commit**
```bash
git add messages/en.json messages/hr.json
git commit -m "i18n(reports): redesign + recommendation labels"
```

---

## Task 9: report-parts.tsx — small presentational parts

**Files:** Create `components/reports/report-parts.tsx`

- [ ] **Step 1: Write the file**

```tsx
"use client";

import type { PersonalBest } from "@/lib/reports/types";

export function SectionHeader({ micro, title }: { micro: string; title: string }) {
  return (
    <div className="mb-3 border-b border-border pb-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{micro}</div>
      <h2 className="mt-0.5 text-[17px] font-semibold text-ink tracking-tight">{title}</h2>
    </div>
  );
}

export function StatCard({
  label, value, sub, delta,
}: { label: string; value: string; sub?: string; delta?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-ink tracking-tight">{value}</span>
        {delta && <span className="text-[12px] font-mono">{delta}</span>}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-3">{sub}</div>}
    </div>
  );
}

/** Start → Now → Goal horizontal progress bar (weight). */
export function GoalProgressBar({
  start, now, target, labels,
}: {
  start: number | null; now: number | null; target: number | null;
  labels: { start: string; now: string; target: string };
}) {
  if (start == null || now == null || target == null || start === target) return null;
  const pct = Math.max(0, Math.min(100, ((start - now) / (start - target)) * 100));
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
        <span>{labels.start} {start}kg</span>
        <span className="text-lime">{labels.now} {now}kg</span>
        <span>{labels.target} {target}kg</span>
      </div>
      <div className="relative h-2 rounded-full bg-surface-2">
        <div className="absolute inset-y-0 left-0 rounded-full bg-lime" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-right font-mono text-[10px] text-ink-3">{Math.round(pct)}%</div>
    </div>
  );
}

/** 7 dots, green when the meal plan was followed that day. */
export function AdherenceDots({
  daily, label,
}: { daily: { date: string; followedMealPlan: boolean | null }[]; label: string }) {
  if (!daily.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className="flex gap-1.5">
        {daily.map((d) => (
          <span
            key={d.date}
            title={d.date}
            className="size-4 rounded-full"
            style={{ background: d.followedMealPlan ? "var(--good)" : "var(--surface-2)" }}
          />
        ))}
      </div>
    </div>
  );
}

export function PersonalBests({ bests, title }: { bests: PersonalBest[]; title: string }) {
  if (!bests.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">★ {title}</div>
      <ul className="mt-2 flex flex-col gap-1 text-[13px] text-ink">
        {bests.map((pb, i) => (
          <li key={i}>{pb.exercise}: <b>{pb.weightKg} kg</b> × {pb.reps}</li>
        ))}
      </ul>
    </div>
  );
}

/** A coach recommendation block (only renders when text is present). */
export function RecommendationBlock({
  icon, label, text,
}: { icon: string; label: string; text: string | null | undefined }) {
  if (!text || !text.trim()) return null;
  return (
    <div className="rounded-xl border border-lime/30 bg-lime/5 p-4">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-lime">
        {icon} {label}
      </div>
      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{text}</p>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**
```bash
git add components/reports/report-parts.tsx
git commit -m "feat(reports): presentational report parts"
```

---

## Task 10: report-charts.tsx — all charts

**Files:** Create `components/reports/report-charts.tsx`

- [ ] **Step 1: Write the file**

```tsx
"use client";

import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import type { WeeklyMetrics, Trends } from "@/lib/reports/types";

const tooltipStyle = {
  background: "var(--surface-2)", border: "1px solid var(--hairline-2)",
  borderRadius: "8px", fontSize: "11px", color: "var(--ink)",
  padding: "6px 10px", fontFamily: "var(--font-geist-mono)",
};
const axisTickStyle = { fontSize: 10, fill: "var(--ink-3)", fontFamily: "var(--font-geist-mono)" };
const SERIES = ["var(--lime)", "var(--carb)", "var(--violet)", "var(--protein, #6ad)"];

function dM(d: string) { const x = new Date(d + "T00:00:00"); return `${x.getDate()}.${x.getMonth() + 1}.`; }
function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{title}</div>
      <div className="mt-3 h-[170px]">
        <ResponsiveContainer width="100%" height="100%">{children as React.ReactElement}</ResponsiveContainer>
      </div>
    </section>
  );
}

export function WeightTrendChart({ points, target, title }: { points: Trends["weightByWeek"]; target: number | null; title: string }) {
  if (points.length < 2) return null;
  const data = points.map((p) => ({ x: dM(p.weekStart), weight: p.value }));
  return (
    <ChartBox title={title}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs><linearGradient id="rdWt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--lime)" stopOpacity={0.25} /><stop offset="100%" stopColor="var(--lime)" stopOpacity={0} />
        </linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
        <XAxis dataKey="x" tick={axisTickStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} width={32} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
        {target != null && <ReferenceLine y={target} stroke="var(--lime)" strokeDasharray="4 4" />}
        <Area type="monotone" dataKey="weight" stroke="var(--lime)" strokeWidth={2} fill="url(#rdWt)" dot={{ r: 2 }} isAnimationActive={false} />
      </AreaChart>
    </ChartBox>
  );
}

export function StrengthChart({ series, title }: { series: Trends["strength"]; title: string }) {
  if (!series.length) return null;
  const weeks = [...new Set(series.flatMap((s) => s.points.map((p) => p.weekStart)))].sort();
  const data = weeks.map((w) => {
    const row: Record<string, string | number> = { x: dM(w) };
    series.forEach((s) => { const pt = s.points.find((p) => p.weekStart === w); if (pt) row[s.exercise] = pt.value; });
    return row;
  });
  return (
    <ChartBox title={title}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
        <XAxis dataKey="x" tick={axisTickStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={36} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
        {series.map((s, i) => (
          <Line key={s.exercise} type="monotone" dataKey={s.exercise} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
        ))}
      </LineChart>
    </ChartBox>
  );
}

export function MeasurementsChart({ points, titles }: { points: Trends["measurements"]; titles: { waist: string; bodyFat: string } }) {
  const waist = points.filter((p) => p.waistCm != null).map((p) => ({ x: dM(p.date), v: p.waistCm }));
  const bf = points.filter((p) => p.bodyFatPct != null).map((p) => ({ x: dM(p.date), v: p.bodyFatPct }));
  if (waist.length < 2 && bf.length < 2) return null;
  const mini = (title: string, data: { x: string; v: number | null }[], color: string) => (
    <ChartBox title={title}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
        <XAxis dataKey="x" tick={axisTickStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} width={32} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
      </LineChart>
    </ChartBox>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {waist.length >= 2 && mini(titles.waist, waist, "var(--lime)")}
      {bf.length >= 2 && mini(titles.bodyFat, bf, "var(--violet)")}
    </div>
  );
}

export function MacroBars({ m, title }: { m: WeeklyMetrics; title: string }) {
  const rows = [
    { name: "Protein", v: m.protein.value, t: m.protein.target, c: "var(--protein, #6ad)" },
    { name: "Carbs", v: m.carbs.value, t: m.carbs.target, c: "var(--carb)" },
    { name: "Fat", v: m.fat.value, t: m.fat.target, c: "var(--fat, #e8a)" },
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{title}</div>
      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const pct = r.v != null && r.t ? Math.max(0, Math.min(100, (r.v / r.t) * 100)) : 0;
          return (
            <div key={r.name}>
              <div className="mb-1 flex justify-between text-[12px] text-ink-2">
                <span>{r.name}</span>
                <span className="font-mono text-ink-3">{r.v == null ? "—" : Math.round(r.v)}{r.t ? ` / ${r.t}` : ""} g</span>
              </div>
              <div className="h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full" style={{ width: `${pct}%`, background: r.c }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CaloriesChart({ daily, target, title }: { daily: WeeklyMetrics["daily"]; target: number | null; title: string }) {
  const data = daily.filter((d) => d.calories != null).map((d) => ({ x: dM(d.date), calories: d.calories }));
  if (data.length < 2) return null;
  return (
    <ChartBox title={title}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
        <XAxis dataKey="x" tick={axisTickStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={36} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
        {target != null && <ReferenceLine y={target} stroke="var(--ink-3)" strokeDasharray="4 4" />}
        <Line type="monotone" dataKey="calories" stroke="var(--carb)" strokeWidth={2} dot={{ r: 2, fill: "var(--carb)" }} isAnimationActive={false} />
      </LineChart>
    </ChartBox>
  );
}

export function StepsChart({ daily, title }: { daily: WeeklyMetrics["daily"]; title: string }) {
  const data = daily.filter((d) => d.steps != null).map((d) => ({ x: dM(d.date), steps: d.steps }));
  if (data.length < 2) return null;
  return (
    <ChartBox title={title}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
        <XAxis dataKey="x" tick={axisTickStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={36} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
        <Bar dataKey="steps" fill="var(--violet)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ChartBox>
  );
}
```

> The `var(--protein, …)` / `var(--fat, …)` syntax uses a fallback color in case the project doesn't define those CSS vars; if `globals.css` already defines `--protein`/`--fat`, those win.

- [ ] **Step 2: Typecheck** — Run `npx tsc --noEmit`; expected: no new errors.
- [ ] **Step 3: Commit**
```bash
git add components/reports/report-charts.tsx
git commit -m "feat(reports): redesigned chart set incl. trends"
```

---

## Task 11: Section components

**Files:** Create `components/reports/nutrition-section.tsx`, `training-section.tsx`, `progress-section.tsx`

- [ ] **Step 1: nutrition-section.tsx**

```tsx
"use client";
import { useTranslations } from "next-intl";
import type { WeeklyReportRow } from "@/lib/reports/types";
import { SectionHeader, StatCard, AdherenceDots, RecommendationBlock } from "./report-parts";
import { MacroBars, CaloriesChart } from "./report-charts";

export function NutritionSection({ report }: { report: WeeklyReportRow }) {
  const t = useTranslations("reports"); const tm = useTranslations("reports.metrics");
  const m = report.metrics; const num = (n: number | null) => (n == null ? "—" : Math.round(n).toString());
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader micro="01" title={t("sections.nutrition")} />
      <RecommendationBlock icon="🍽️" label={t("recommendations")} text={report.rec_nutrition} />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label={tm("calories")} value={num(m.calories.value)} sub={m.calories.target ? `${tm("vsTarget")} ${m.calories.target}` : undefined} />
        <StatCard label={tm("adherence")} value={m.mealPlanAdherencePct == null ? "—" : `${m.mealPlanAdherencePct}%`} />
      </div>
      <MacroBars m={m} title={t("macros")} />
      <AdherenceDots daily={m.daily} label={t("adherence7d")} />
      <CaloriesChart daily={m.daily} target={m.calories.target} title={tm("calories")} />
    </section>
  );
}
```

- [ ] **Step 2: training-section.tsx**

```tsx
"use client";
import { useTranslations } from "next-intl";
import type { WeeklyReportRow } from "@/lib/reports/types";
import { SectionHeader, StatCard, PersonalBests, RecommendationBlock } from "./report-parts";
import { StrengthChart } from "./report-charts";

export function TrainingSection({ report }: { report: WeeklyReportRow }) {
  const t = useTranslations("reports"); const tm = useTranslations("reports.metrics");
  const m = report.metrics;
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader micro="02" title={t("sections.training")} />
      <RecommendationBlock icon="🏋️" label={t("recommendations")} text={report.rec_training} />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label={tm("training")} value={m.training.sessionsPlanned != null ? tm("sessions", { done: m.training.sessionsDone, planned: m.training.sessionsPlanned }) : String(m.training.sessionsDone)} />
        <StatCard label="Volume" value={m.training.totalVolumeKg == null ? "—" : `${m.training.totalVolumeKg} kg`} />
      </div>
      <PersonalBests bests={m.training.personalBests} title={t("personalBests")} />
      <StrengthChart series={m.trends.strength} title={t("strengthTrend")} />
    </section>
  );
}
```

- [ ] **Step 3: progress-section.tsx**

```tsx
"use client";
import { useTranslations } from "next-intl";
import type { WeeklyReportRow } from "@/lib/reports/types";
import { SectionHeader, StatCard, GoalProgressBar } from "./report-parts";
import { WeightTrendChart, MeasurementsChart, StepsChart } from "./report-charts";

export function ProgressSection({ report, locale }: { report: WeeklyReportRow; locale: "hr" | "en" }) {
  void locale;
  const t = useTranslations("reports"); const tm = useTranslations("reports.metrics");
  const m = report.metrics; const num = (n: number | null, dp = 0) => (n == null ? "—" : n.toFixed(dp));
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader micro="03" title={t("sections.progress")} />
      <GoalProgressBar start={m.weight.startWeightKg} now={m.weight.end} target={m.weight.targetWeightKg}
        labels={{ start: t("goalStart"), now: t("goalNow"), target: t("goalTarget") }} />
      <WeightTrendChart points={m.trends.weightByWeek} target={m.weight.targetWeightKg} title={t("weightTrend")} />
      <MeasurementsChart points={m.trends.measurements} titles={{ waist: t("waist"), bodyFat: t("bodyFat") }} />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label={tm("sleep")} value={`${num(m.sleepH.value, 1)} h`} />
        <StatCard label={tm("energy")} value={num(m.energy.value, 1)} />
      </div>
      <StepsChart daily={m.daily} title={tm("steps")} />
    </section>
  );
}
```

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit` → expected: no new errors.
```bash
git add components/reports/nutrition-section.tsx components/reports/training-section.tsx components/reports/progress-section.tsx
git commit -m "feat(reports): Nutrition/Training/Progress sections"
```

---

## Task 12: report-view.tsx — compose the report

**Files:** Create `components/reports/report-view.tsx`

- [ ] **Step 1: Write the file**

```tsx
"use client";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import type { WeeklyReportRow } from "@/lib/reports/types";
import { RecommendationBlock } from "./report-parts";
import { NutritionSection } from "./nutrition-section";
import { TrainingSection } from "./training-section";
import { ProgressSection } from "./progress-section";
import { DownloadPdfButton } from "./download-pdf-button";

function weekLabel(start: string, end: string) {
  const s = new Date(start + "T00:00:00"); const e = new Date(end + "T00:00:00");
  return `${s.getDate()}.${s.getMonth() + 1}. – ${e.getDate()}.${e.getMonth() + 1}.`;
}

export function ReportView({ report, locale }: { report: WeeklyReportRow; locale: "hr" | "en" }) {
  const t = useTranslations("reports");
  const ref = useRef<HTMLDivElement>(null);
  const m = report.metrics;
  const change = m.weight.changeKg;
  const lastName = "report";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
          {t("weekOf", { date: weekLabel(report.week_start, report.week_end) })}
          {m.phase?.name ? ` · ${m.phase.name}` : ""}
        </div>
        <DownloadPdfButton targetRef={ref} filename={`koachapp-${lastName}-${report.week_start}.pdf`} label={t("downloadPdf")} />
      </div>

      <div ref={ref} className="flex flex-col gap-6 bg-bg">
        {/* Hero headline */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">{t("title")}</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-[30px] font-semibold tracking-tight text-ink">{m.weight.end == null ? "—" : `${m.weight.end} kg`}</span>
            {change != null && (
              <span className="font-mono text-[14px]" style={{ color: change <= 0 ? "var(--good)" : "var(--warn)" }}>
                {change > 0 ? "+" : ""}{change} kg
              </span>
            )}
          </div>
        </div>

        {/* General recommendation + AI summary */}
        <RecommendationBlock icon="💬" label={t("recommendations")} text={report.rec_general} />
        {report.client_summary && (
          <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">{report.client_summary}</div>
        )}

        <NutritionSection report={report} />
        <TrainingSection report={report} />
        <ProgressSection report={report} locale={locale} />

        <div className="border-t border-border pt-3 text-center font-mono text-[10px] text-ink-3">
          {t("generatedOn", { date: new Date(report.generated_at).toLocaleDateString() })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** — Run `npx tsc --noEmit`; expected: error only for missing `./download-pdf-button` (Task 13).
- [ ] **Step 3: Commit**
```bash
git add components/reports/report-view.tsx
git commit -m "feat(reports): composed ReportView (hero + sections + recs)"
```

---

## Task 13: download-pdf-button.tsx — PDF export

**Files:** Create `components/reports/download-pdf-button.tsx`

- [ ] **Step 1: Write the file**

```tsx
"use client";
import { useState } from "react";

export function DownloadPdfButton({
  targetRef, filename, label,
}: { targetRef: React.RefObject<HTMLDivElement | null>; filename: string; label: string }) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    const node = targetRef.current;
    if (!node || busy) return;
    setBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: getComputedStyle(document.body).getPropertyValue("--bg") || "#0A0B0D",
        useCORS: true,
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pw) / canvas.width;
      let pos = 0;
      pdf.addImage(img, "PNG", 0, pos, pw, imgH);
      let remaining = imgH - ph;
      while (remaining > 0) {
        pos -= ph;
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, pos, pw, imgH);
        remaining -= ph;
      }
      pdf.save(filename);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      data-html2canvas-ignore
      className="rounded-lg border border-border px-3 py-1.5 text-[12px] text-ink-2 hover:bg-surface-2 disabled:opacity-50"
    >
      {busy ? "…" : label}
    </button>
  );
}
```

> Dynamic `import()` keeps `html2canvas`/`jspdf` out of the initial bundle (loaded only on click).

- [ ] **Step 2: Typecheck** — Run `npx tsc --noEmit`; expected: no errors (ReportView + button resolve now).
- [ ] **Step 3: Commit**
```bash
git add components/reports/download-pdf-button.tsx
git commit -m "feat(reports): one-click PDF export"
```

---

## Task 14: Wire consumers (coach review + client detail), remove old metrics

**Files:** Modify `app/coach/reports/[id]/review-form.tsx`, `app/app/reports/[id]/page.tsx`; remove `components/reports/report-metrics.tsx`

- [ ] **Step 1: Client detail — use ReportView**

In `app/app/reports/[id]/page.tsx`, replace the import `import { ReportMetrics } from "@/components/reports/report-metrics";` with `import { ReportView } from "@/components/reports/report-view";`, and replace the whole returned JSX body with:
```tsx
  return (
    <div className="px-5 pt-5 pb-10">
      <MicroLabel>~/Reports</MicroLabel>
      <ReportView report={report} locale={locale} />
    </div>
  );
```
(Keep the existing data fetch, `notFound()`, `locale`, and `MicroLabel` import. The coach note / summary / week heading now live inside `ReportView`, so remove the old inline heading/coach_note/client_summary blocks.)

- [ ] **Step 2: Coach review-form — recommendations + ReportView**

In `app/coach/reports/[id]/review-form.tsx`:
1. Replace `import { ReportMetrics } from "@/components/reports/report-metrics";` with `import { ReportView } from "@/components/reports/report-view";`.
2. Add three state hooks after the existing `coachNote` state:
```tsx
  const [recTraining, setRecTraining] = useState(report.rec_training ?? "");
  const [recNutrition, setRecNutrition] = useState(report.rec_nutrition ?? "");
  const [recGeneral, setRecGeneral] = useState(report.rec_general ?? "");
```
3. Update the `releaseReport` call inside `onRelease` to pass them:
```tsx
      const res = await releaseReport(report.id, {
        clientSummary, coachNote, recTraining, recNutrition, recGeneral,
      });
```
4. Add three textareas after the existing coach-note textarea (before the buttons), using the i18n labels:
```tsx
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">🏋️ {t("recTraining")}</label>
      <textarea value={recTraining} onChange={(e) => setRecTraining(e.target.value)} disabled={published || pending} rows={2}
        placeholder={t("recTrainingPlaceholder")} className="mb-3 w-full rounded-xl border border-border bg-card p-3 text-[14px] text-ink outline-none focus:border-lime disabled:opacity-60" />
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">🍽️ {t("recNutrition")}</label>
      <textarea value={recNutrition} onChange={(e) => setRecNutrition(e.target.value)} disabled={published || pending} rows={2}
        placeholder={t("recNutritionPlaceholder")} className="mb-3 w-full rounded-xl border border-border bg-card p-3 text-[14px] text-ink outline-none focus:border-lime disabled:opacity-60" />
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">💬 {t("recGeneral")}</label>
      <textarea value={recGeneral} onChange={(e) => setRecGeneral(e.target.value)} disabled={published || pending} rows={2}
        placeholder={t("recGeneralPlaceholder")} className="mb-5 w-full rounded-xl border border-border bg-card p-3 text-[14px] text-ink outline-none focus:border-lime disabled:opacity-60" />
```
5. Replace the bottom `<ReportMetrics metrics={report.metrics} locale={locale} />` with `<ReportView report={report} locale={locale} />`.

> Note: `releaseReport` saves the recs from form state. The `ReportView` preview reflects `report.*` (server data) and updates after `router.refresh()` post-release — acceptable for a preview. (Optional polish, not required: pass live state into the preview.)

- [ ] **Step 3: Remove the superseded component**
```bash
git rm components/reports/report-metrics.tsx
```

- [ ] **Step 4: Typecheck + lint + tests**

Run: `npx tsc --noEmit` → expected: 0 errors.
Run: `npx vitest run` → expected: all pass.
Run: `npx eslint app/app/reports app/coach/reports components/reports lib/reports actions/reports.ts` → expected: clean.

- [ ] **Step 5: Commit**
```bash
git add app/coach/reports/[id]/review-form.tsx app/app/reports/[id]/page.tsx components/reports/report-metrics.tsx
git commit -m "feat(reports): wire ReportView + coach recommendations; drop old metrics view"
```

---

## Task 15: Verify on preview + production

**Files:** none (deploy + verification)

- [ ] **Step 1: Push branch + open PR**

```bash
git push -u origin feature/report-redesign
gh pr create --base main --head feature/report-redesign --title "Report redesign — sections, progress graphs, PDF, coach recommendations" --body "Sectioned report (Nutrition/Training/Progress), 4 progress graphs, html2canvas+jspdf PDF, 3 coach recommendation fields. Spec: docs/plans/2026-05-30-report-redesign-design.md"
```

- [ ] **Step 2: Wait for the Vercel preview to be READY**

Use the Vercel MCP `list_deployments` (project `prj_ZxWfkcThNaooZWTCjiFlC4j6hmn9`, team `team_aSFGBWAD6EwLA1Gw2IirKZcI`); confirm the newest deployment for the branch is `state: READY` (the build must pass).

- [ ] **Step 3: Regenerate Marko's report against the new code**

The seeded **Marko Horvat** client (id `2068e266-5405-4066-9a61-eb6cbc3b836e`) already has 2 weeks of data. Trigger generation so `metrics.trends` populates, via the production cron once merged, OR (pre-merge) confirm trend data shape with Supabase MCP `execute_sql`:
```sql
select (metrics->'trends'->'weightByWeek') as weight_trend,
       jsonb_array_length(metrics->'trends'->'strength') as strength_lifts,
       jsonb_array_length(metrics->'trends'->'measurements') as meas_points
from weekly_reports where client_id = '2068e266-5405-4066-9a61-eb6cbc3b836e';
```
(After a regeneration; expected: 2 weight-trend points, ≥1 strength lift, 2 measurement points.)

- [ ] **Step 4: Visual check on the preview (coach login)**

Open the preview URL, log in as coach → **Reports → Marko Horvat**. Confirm: three sections render with headers; weight-trend / strength / measurements / macro / calories / steps charts show; the **Download PDF** button produces a PDF that looks like the report (no button in it); filling the 3 recommendation boxes + **Release** shows them in context.

- [ ] **Step 5: Merge to production**
```bash
gh pr merge <PR#> --merge
```
Then confirm the production deploy is READY (Vercel MCP) and run the production cron to regenerate with trends:
`curl -s -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env.local | cut -d= -f2)" https://koachapp.vercel.app/api/cron/weekly-reports`
Expected: `{"generated":N,"failures":[]}`.

---

## Self-review notes (coverage vs spec)

- Spec §2 (sections, 4 graphs, trends-in-snapshot, PDF, recommendations) → Tasks 5/6 (trends), 10–12 (graphs+sections+view), 13 (PDF), 1/7/14 (recommendations). §3 data model → Tasks 1 (rec columns), 3 (types), 4 (daily flag). §4 computeTrends → Task 5. §5 generation → Task 6. §6 UI → Tasks 9–14. §7 PDF → Task 13. §8 edge cases → guards in chart components (`<2` points hide), `GoalProgressBar`/`RecommendationBlock` null-guards. §9 testing → Tasks 4/5 unit, 15 visual+data.
- Type consistency: `Trends`/`TrendPoint`/`DailyPoint`/`WeeklyReportRow` defined in Task 3 and consumed identically in Tasks 5/6/9–12; `releaseReport` payload shape (Task 7) matches the callsite (Task 14); `computeTrends` input matches the fetch in Task 6.
- Note: `metrics.trends` is defaulted to empty arrays in `computeMetrics` (Task 4) and overwritten in `generate.ts` (Task 6), so `WeeklyMetrics` is always valid even if a future caller skips trend attachment.
