# Weekly Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Sunday, auto-generate a per-client weekly report (metrics + AI coach summary) as a coach-reviewed draft; the coach edits, adds a note, and releases it to the client.

**Architecture:** A pure aggregation/flagging core (`lib/reports/*`, unit-tested with vitest) is wrapped by an impure orchestrator (`generate.ts`) that fetches Supabase data, calls Claude for the narrative, and upserts a `weekly_reports` row. A Vercel Cron route triggers Sunday generation for all active clients. Coach server actions handle generate-now / regenerate / release. Client and coach UIs render the stored snapshot with recharts.

**Tech Stack:** Next.js 16 (App Router, RSC + server actions), Supabase (Postgres + RLS, service-role admin client), `@anthropic-ai/sdk` (Claude Haiku), recharts, next-intl (hr/en), vitest.

**Reference spec:** `docs/plans/2026-05-30-weekly-reports-design.md`

---

## Conventions to follow (from the existing codebase)

- **Server actions** live in `actions/*.ts`, start with `"use server"`, and return `{ error: "code" }` or `{ data }` / `{ success: true }`. Client components map codes with `translateError` (`lib/translate-error.ts`).
- **Auth:** `requireCoach()` / `requireCoachOwnsClient(id)` from `lib/auth/require-coach.ts`. Coach UUID is `process.env.NEXT_PUBLIC_COACH_UUID`.
- **Supabase:** `createClient()` (`lib/supabase/server.ts`) for user/RLS-scoped reads; `supabaseAdmin` (`lib/supabase/admin.ts`) for service-role.
- **Dates:** `todayCET()` (`lib/date.ts`) returns Zagreb `YYYY-MM-DD`. Week = Monday→Sunday.
- **Styling:** Tailwind with CSS variables — `bg-card`, `border-border`, `text-ink`/`text-ink-2`/`text-ink-3`, `var(--lime)`, `var(--carb)`, `var(--violet)`, `var(--good)`/`var(--warn)`/`var(--danger)`. Reuse tone helpers in `lib/metric-direction.ts`.
- **Charts:** recharts with the `tooltipStyle` / `axisTickStyle` pattern from `app/app/progress/page.tsx`.
- **i18n:** add keys to BOTH `messages/en.json` and `messages/hr.json`; read with `useTranslations("namespace")`.
- A client's display name is `profiles.full_name` (the `clients` table has no name column).

## File structure (created / modified)

**Created**
- `supabase/migrations/20260530_weekly_reports.sql` — table + RLS
- `vitest.config.ts` — test runner config
- `lib/reports/types.ts` — shared types
- `lib/reports/week.ts` — pure week-boundary helpers (+ `week.test.ts`)
- `lib/reports/aggregate.ts` — pure `computeMetrics` + row types + impure `fetchWeekData` (+ `aggregate.test.ts`)
- `lib/reports/flags.ts` — pure `computeFlags` (+ `flags.test.ts`)
- `lib/reports/ai.ts` — Claude summary generation
- `lib/reports/generate.ts` — orchestrator (fetch → compute → flag → AI → upsert)
- `lib/push.ts` — `sendPushToClient` helper
- `actions/reports.ts` — `generateNow` / `regenerateReport` / `releaseReport`
- `app/api/cron/weekly-reports/route.ts` — Sunday cron trigger
- `vercel.json` — cron schedule
- `components/reports/report-metrics.tsx` — presentational metric cards + charts
- `components/reports/flag-list.tsx` — flag badges (coach)
- `app/app/reports/page.tsx` — client report list
- `app/app/reports/[id]/page.tsx` — client report detail
- `app/coach/reports/page.tsx` — coach overview + drafts + history
- `app/coach/reports/[id]/page.tsx` — coach review/edit page
- `app/coach/reports/[id]/review-form.tsx` — edit/release/regenerate client component

**Modified**
- `package.json` — add `@anthropic-ai/sdk`, `vitest`; `test` scripts
- `.env.local` — `ANTHROPIC_API_KEY`, `CRON_SECRET`
- `messages/en.json`, `messages/hr.json` — `reports` namespace + nav labels
- `app/app/layout.tsx` — add Reports tab to client nav
- `components/coach-shell/coach-shell.tsx` — add Reports link to coach nav
- `app/coach/clients/[id]/page.tsx` — link to that client's latest report

> **Notification note (refinement of spec §12):** the **client** push on release is implemented (clients have `push_subscriptions`). The **coach** is notified via an in-app "drafts ready" indicator on the coach Reports nav rather than web push, because `push_subscriptions` is client-scoped and the coach has no subscription. Coach push is a future enhancement.

---

## Task 1: Database — `weekly_reports` table + RLS

**Files:**
- Create: `supabase/migrations/20260530_weekly_reports.sql`

- [ ] **Step 1: Write the migration SQL file**

Create `supabase/migrations/20260530_weekly_reports.sql`:

```sql
-- ============================================================
-- KoachApp Weekly Reports
-- One coach-reviewed AI report per client per week (Mon–Sun).
-- ============================================================

CREATE TABLE weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES profiles(id),
  week_start date NOT NULL,                 -- Monday
  week_end date NOT NULL,                    -- Sunday
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  language text NOT NULL DEFAULT 'hr'
    CHECK (language IN ('hr', 'en')),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_summary text,
  coach_summary text,
  coach_note text,
  ai_model text,
  ai_generated_at timestamptz,
  generated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, week_start)
);

CREATE INDEX idx_weekly_reports_coach_week
  ON weekly_reports (coach_id, week_start DESC);
CREATE INDEX idx_weekly_reports_client_status
  ON weekly_reports (client_id, status, week_start DESC);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- Coach: full access to their clients' reports (all statuses)
CREATE POLICY "Coach manages own client reports"
  ON weekly_reports FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Client: read only their own PUBLISHED reports
CREATE POLICY "Client reads own published reports"
  ON weekly_reports FOR SELECT
  USING (auth.uid() = client_id AND status = 'published');
```

- [ ] **Step 2: Apply the migration to the remote project**

Use the Supabase MCP tool `apply_migration` with `project_id` `zyjwkdsulzosfuadnnwq`, name `weekly_reports`, and the SQL above.

- [ ] **Step 3: Verify the table exists**

Use the Supabase MCP tool `execute_sql` with:
```sql
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='weekly_reports' order by ordinal_position;
```
Expected: 18 rows including `status`, `metrics` (jsonb), `flags` (jsonb), `client_summary`, `coach_note`, `published_at`, plus the `UNIQUE (client_id, week_start)`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260530_weekly_reports.sql
git commit -m "feat(reports): add weekly_reports table + RLS"
```

---

## Task 2: Test tooling — vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest`
Expected: added to devDependencies, no errors.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add test scripts to `package.json`**

In the `"scripts"` block add:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Smoke-test the runner**

Create a temporary file `lib/reports/_smoke.test.ts`:
```ts
import { test, expect } from "vitest";
test("vitest runs", () => {
  expect(1 + 1).toBe(2);
});
```
Run: `npx vitest run lib/reports/_smoke.test.ts`
Expected: 1 passed. Then delete the file: `rm lib/reports/_smoke.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest test runner"
```

---

## Task 3: `lib/reports/types.ts`

**Files:**
- Create: `lib/reports/types.ts`

- [ ] **Step 1: Write the types**

```ts
// lib/reports/types.ts
// Shared types for weekly report generation + rendering.

export type ReportStatus = "draft" | "published";
export type ReportLanguage = "hr" | "en";

/** A metric with this-week value, previous-week value, and optional target. */
export type MetricPair = {
  value: number | null;
  prev: number | null;
  target: number | null;
};

export type PersonalBest = {
  exercise: string;
  weightKg: number;
  reps: number;
};

export type DailyPoint = {
  date: string; // YYYY-MM-DD
  weightKg: number | null;
  calories: number | null;
  steps: number | null;
};

export type CheckinEcho = {
  overall: number | null;
  energy: number | null;
  stress: number | null;
  motivation: number | null;
  appetite: number | null;
  adherenceDietPct: number | null;
  adherenceTraining: boolean | null;
  whatWentWell: string | null;
  challenges: string | null;
  goalsNextWeek: string | null;
  questionsForCoach: string | null;
};

export type PhaseInfo = {
  name: string | null;
  type: string | null;
  targetKcal: number | null;
};

export type WeeklyMetrics = {
  daysLogged: number;
  weight: {
    start: number | null;
    end: number | null;
    avg: number | null;
    changeKg: number | null;
    startWeightKg: number | null;
    targetWeightKg: number | null;
  };
  calories: MetricPair;
  protein: MetricPair;
  carbs: MetricPair;
  fat: MetricPair;
  steps: MetricPair;
  sleepH: MetricPair;
  sleepQuality: MetricPair;
  energy: MetricPair;
  waterL: MetricPair;
  cardioMin: number;
  mealPlanAdherencePct: number | null;
  training: {
    sessionsDone: number;
    sessionsPlanned: number | null;
    totalVolumeKg: number | null;
    totalDurationMin: number;
    personalBests: PersonalBest[];
  };
  measurement: {
    waistCm: number | null;
    waistPrevCm: number | null;
    bodyFatPct: number | null;
    bodyFatPrevPct: number | null;
  } | null;
  checkin: CheckinEcho | null;
  phase: PhaseInfo | null;
  daily: DailyPoint[];
};

export type FlagSeverity = "info" | "warn" | "danger";
export type Flag = {
  key: string;
  severity: FlagSeverity;
  text_hr: string;
  text_en: string;
};

export type AiSummaries = {
  client_summary: string;
  coach_summary: string;
};

/** Shape of a `weekly_reports` row as read back from Supabase. */
export type WeeklyReportRow = {
  id: string;
  client_id: string;
  coach_id: string;
  week_start: string;
  week_end: string;
  status: ReportStatus;
  language: ReportLanguage;
  metrics: WeeklyMetrics;
  flags: Flag[];
  client_summary: string | null;
  coach_summary: string | null;
  coach_note: string | null;
  ai_model: string | null;
  ai_generated_at: string | null;
  generated_at: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (the file only declares types).

- [ ] **Step 3: Commit**

```bash
git add lib/reports/types.ts
git commit -m "feat(reports): shared report types"
```

---

## Task 4: `lib/reports/week.ts` (TDD)

**Files:**
- Create: `lib/reports/week.ts`
- Test: `lib/reports/week.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/reports/week.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/reports/week.test.ts`
Expected: FAIL — `Failed to resolve import "./week"`.

- [ ] **Step 3: Write the implementation**

`lib/reports/week.ts`:
```ts
// lib/reports/week.ts
// Pure week-boundary helpers over YYYY-MM-DD strings (Europe/Zagreb calendar
// dates). Uses noon-UTC anchors so ±day arithmetic never crosses a date line.

/** ISO day-of-week for a YYYY-MM-DD date: 1=Mon ... 7=Sun. */
export function isoDow(dateStr: string): number {
  const js = new Date(dateStr + "T12:00:00Z").getUTCDay(); // 0=Sun..6=Sat
  return js === 0 ? 7 : js;
}

/** Add n days to a YYYY-MM-DD date, returning YYYY-MM-DD. */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday (start) and Sunday (end) of the ISO week containing dateStr. */
export function weekBounds(dateStr: string): {
  weekStart: string;
  weekEnd: string;
} {
  const weekStart = addDays(dateStr, -(isoDow(dateStr) - 1));
  return { weekStart, weekEnd: addDays(weekStart, 6) };
}

/** Monday of the week before the given week start. */
export function previousWeekStart(weekStart: string): string {
  return addDays(weekStart, -7);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/reports/week.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/reports/week.ts lib/reports/week.test.ts
git commit -m "feat(reports): pure week-boundary helpers"
```

---

## Task 5: `lib/reports/aggregate.ts` — `computeMetrics` (TDD)

**Files:**
- Create: `lib/reports/aggregate.ts`
- Test: `lib/reports/aggregate.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/reports/aggregate.test.ts`:
```ts
import { test, expect } from "vitest";
import { computeMetrics, type DailyLogRow, type ClientTargets } from "./aggregate";

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
  expect(m.daily[0]).toEqual({ date: "2026-05-25", weightKg: 89, calories: 2000, steps: 8000 });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/reports/aggregate.test.ts`
Expected: FAIL — cannot resolve `./aggregate`.

- [ ] **Step 3: Write the implementation**

`lib/reports/aggregate.ts`:
```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/reports/aggregate.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/reports/aggregate.ts lib/reports/aggregate.test.ts
git commit -m "feat(reports): pure weekly metric computation"
```

---

## Task 6: `lib/reports/flags.ts` (TDD)

**Files:**
- Create: `lib/reports/flags.ts`
- Test: `lib/reports/flags.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/reports/flags.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/reports/flags.test.ts`
Expected: FAIL — cannot resolve `./flags`.

- [ ] **Step 3: Write the implementation**

`lib/reports/flags.ts`:
```ts
// lib/reports/flags.ts
// Pure, rule-based concern flags. Deterministic (not AI) so they're reliable.

import type { WeeklyMetrics, Flag } from "./types";

export function computeFlags(m: WeeklyMetrics): Flag[] {
  const flags: Flag[] = [];

  if (m.daysLogged < 4) {
    flags.push({
      key: "low_logging",
      severity: m.daysLogged <= 1 ? "danger" : "warn",
      text_hr: `Samo ${m.daysLogged} od 7 dana uneseno`,
      text_en: `Only ${m.daysLogged} of 7 days logged`,
    });
  }

  if (m.training.sessionsDone === 0) {
    flags.push({
      key: "missed_training",
      severity: "warn",
      text_hr: "Nijedan trening nije zabilježen ovaj tjedan",
      text_en: "No workouts logged this week",
    });
  }

  if (
    m.sleepH.value != null &&
    m.sleepH.target != null &&
    m.sleepH.value < m.sleepH.target - 1
  ) {
    flags.push({
      key: "sleep_low",
      severity: "warn",
      text_hr: `Prosječan san ${m.sleepH.value} h (cilj ${m.sleepH.target} h)`,
      text_en: `Avg sleep ${m.sleepH.value}h (target ${m.sleepH.target}h)`,
    });
  }

  if (m.calories.value != null && m.calories.target) {
    const diffPct =
      Math.abs(m.calories.value - m.calories.target) / m.calories.target;
    if (diffPct > 0.2) {
      flags.push({
        key: "calories_off_target",
        severity: "info",
        text_hr: `Kalorije ${Math.round(m.calories.value)} vs cilj ${m.calories.target}`,
        text_en: `Calories ${Math.round(m.calories.value)} vs target ${m.calories.target}`,
      });
    }
  }

  if (
    m.phase &&
    (m.phase.type === "fat_loss" || m.phase.type === "muscle_gain") &&
    m.weight.changeKg != null &&
    Math.abs(m.weight.changeKg) < 0.2
  ) {
    flags.push({
      key: "weight_stalled",
      severity: "info",
      text_hr: "Težina stagnira ovaj tjedan",
      text_en: "Weight is stalled this week",
    });
  }

  if (m.checkin?.questionsForCoach && m.checkin.questionsForCoach.trim()) {
    flags.push({
      key: "open_question",
      severity: "info",
      text_hr: "Klijent ima pitanje za trenera",
      text_en: "Client left a question for the coach",
    });
  }

  return flags;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/reports/flags.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/reports/flags.ts lib/reports/flags.test.ts
git commit -m "feat(reports): rule-based concern flags"
```

---

## Task 7: Dependencies + environment

**Files:**
- Modify: `package.json` (via npm)
- Modify: `.env.local`

> **Igor provides one value here:** an Anthropic API key. Guide him: go to https://console.anthropic.com → Settings → API Keys → Create Key → copy the `sk-ant-...` value. Pay-as-you-go; this feature costs a fraction of a cent per client per week.

- [ ] **Step 1: Install the Anthropic SDK**

Run: `npm install @anthropic-ai/sdk`
Expected: added to dependencies.

- [ ] **Step 2: Add env vars to `.env.local`**

Append:
```
# Weekly reports
ANTHROPIC_API_KEY=sk-ant-...           # provided by Igor
CRON_SECRET=<generate a long random string>
```
Generate the cron secret with: `openssl rand -hex 32` and paste it as `CRON_SECRET`.

- [ ] **Step 3: Verify the key loads**

Run: `node -e "require('dotenv').config({path:'.env.local'}); console.log('ANTHROPIC key present:', !!process.env.ANTHROPIC_API_KEY, '| CRON present:', !!process.env.CRON_SECRET)"`
(If `dotenv` isn't installed, instead just confirm both lines exist: `grep -c 'ANTHROPIC_API_KEY=sk-ant\|CRON_SECRET=' .env.local` → expected `2`.)
Expected: both present.

- [ ] **Step 4: Commit (lockfile only — never commit `.env.local`)**

```bash
git add package.json package-lock.json
git commit -m "chore(reports): add @anthropic-ai/sdk"
```
Confirm `.env.local` is untracked: `git status --short .env.local` should print nothing (it's gitignored).

---

## Task 8: `lib/reports/ai.ts` — Claude summaries

**Files:**
- Create: `lib/reports/ai.ts`

> **REQUIRED SUB-SKILL:** invoke the `claude-api` skill before writing this — it confirms the current Haiku model id and the prompt-caching pattern. Use prompt caching on the system block (per that skill).

- [ ] **Step 1: Write the module**

`lib/reports/ai.ts`:
```ts
// lib/reports/ai.ts
// Generates the client + coach narrative via Claude. Returns empty strings on
// failure (the orchestrator still saves metrics + flags); the coach can retry
// with "Regenerate".

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { WeeklyMetrics, Flag, AiSummaries, ReportLanguage } from "./types";

// Confirm the exact current id via the claude-api skill before shipping.
export const REPORT_MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You write weekly fitness-coaching reports from a JSON summary of one client's week.

Return STRICT JSON only, no prose around it:
{"client_summary": "...", "coach_summary": "..."}

client_summary — addressed to the client, warm and encouraging, 2 to 4 short paragraphs:
- How the week went and the biggest wins (cite real numbers from the data only).
- 2 to 3 concrete focus points for next week.
- If little was logged (low daysLogged), gently acknowledge the gap and encourage more consistent logging — never invent numbers.

coach_summary — addressed to the coach, concise and clinical, 1 short paragraph:
- Key changes vs targets and vs last week, adherence, training, and any concerns.

Rules:
- Use ONLY numbers present in the data. Do not fabricate measurements, weights, or PRs.
- No medical or diagnostic claims.
- Write BOTH summaries in {{LANGUAGE}}.`;

function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return {};
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return {};
  }
}

export async function generateSummaries(args: {
  clientName: string;
  language: ReportLanguage;
  metrics: WeeklyMetrics;
  flags: Flag[];
}): Promise<AiSummaries> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const languageName = args.language === "hr" ? "Croatian" : "English";

  const resp = await client.messages.create({
    model: REPORT_MODEL,
    max_tokens: 1200,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT.replace("{{LANGUAGE}}", languageName),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content:
          `Client: ${args.clientName}\n` +
          `Week data (JSON):\n${JSON.stringify({ metrics: args.metrics, flags: args.flags })}\n\n` +
          `Return only the JSON object.`,
      },
    ],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = extractJson(text);
  return {
    client_summary: String(parsed.client_summary ?? "").trim(),
    coach_summary: String(parsed.coach_summary ?? "").trim(),
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (A live call is exercised end-to-end in Task 16.)

- [ ] **Step 3: Commit**

```bash
git add lib/reports/ai.ts
git commit -m "feat(reports): Claude summary generation"
```

---

## Task 9: `lib/push.ts` + `lib/reports/generate.ts` (orchestrator)

**Files:**
- Create: `lib/push.ts`
- Create: `lib/reports/generate.ts`

- [ ] **Step 1: Write the push helper**

`lib/push.ts`:
```ts
// lib/push.ts
// Server-side helper that triggers the send-push Edge Function for a client.
import "server-only";

export async function sendPushToClient(
  clientId: string,
  title: string,
  body: string
): Promise<{ sent?: number; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ client_id: clientId, title, body }),
    });
    if (!res.ok) {
      console.error("sendPushToClient failed:", await res.text());
      return { error: "sendFailed" };
    }
    const json = await res.json();
    return { sent: json.sent as number };
  } catch (err) {
    console.error("sendPushToClient error:", err);
    return { error: "sendFailed" };
  }
}
```

- [ ] **Step 2: Write the orchestrator**

`lib/reports/generate.ts`:
```ts
// lib/reports/generate.ts
// Fetches a client's week of data, computes metrics + flags, calls Claude, and
// upserts a weekly_reports row (draft). Used by the cron route and coach actions.

import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { weekBounds, previousWeekStart, addDays } from "./week";
import {
  computeMetrics,
  type DailyLogRow,
  type SessionAgg,
  type ExerciseSetRow,
} from "./aggregate";
import { computeFlags } from "./flags";
import { generateSummaries, REPORT_MODEL } from "./ai";
import type { WeeklyReportRow, ReportLanguage, CheckinEcho, PhaseInfo } from "./types";

const DAILY_COLS =
  "log_date, weight_kg, calories_kcal, protein_g, carbs_g, fat_g, steps, cardio_min, sleep_h, sleep_quality, energy_level, water_l, followed_meal_plan";

export async function generateReportForClient(
  clientId: string,
  anyDateInWeek: string
): Promise<WeeklyReportRow> {
  const { weekStart, weekEnd } = weekBounds(anyDateInWeek);
  const prevStart = previousWeekStart(weekStart);
  const prevEnd = addDays(prevStart, 6);

  // ── Do not overwrite a published report ──────────────────
  const { data: existing } = await supabaseAdmin
    .from("weekly_reports")
    .select("id, status")
    .eq("client_id", clientId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (existing?.status === "published") {
    const { data } = await supabaseAdmin
      .from("weekly_reports")
      .select("*")
      .eq("id", existing.id)
      .single();
    return data as WeeklyReportRow;
  }

  // ── Client + profile (name, language, targets) ───────────
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select(
      "id, coach_id, start_weight_kg, target_weight_kg, target_calories, target_protein_g, target_carbs_g, target_fat_g, target_steps, target_sleep_h"
    )
    .eq("id", clientId)
    .single();
  if (!client) throw new Error(`client ${clientId} not found`);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, language")
    .eq("id", clientId)
    .single();
  const clientName = profile?.full_name ?? "Client";
  const language: ReportLanguage = profile?.language === "en" ? "en" : "hr";

  // ── Daily logs (week + previous week) ────────────────────
  const [{ data: weekLogs }, { data: prevLogs }] = await Promise.all([
    supabaseAdmin
      .from("daily_logs")
      .select(DAILY_COLS)
      .eq("client_id", clientId)
      .gte("log_date", weekStart)
      .lte("log_date", weekEnd),
    supabaseAdmin
      .from("daily_logs")
      .select(DAILY_COLS)
      .eq("client_id", clientId)
      .gte("log_date", prevStart)
      .lte("log_date", prevEnd),
  ]);

  // ── Workout sessions + sets (this week) ──────────────────
  const { data: sessionRows } = await supabaseAdmin
    .from("workout_sessions")
    .select("id, duration_min, exercise_logs(exercise_id, reps, weight_kg)")
    .eq("client_id", clientId)
    .gte("session_date", weekStart)
    .lte("session_date", weekEnd);

  const sessions: SessionAgg[] = (sessionRows ?? []).map((s) => ({
    durationMin: (s as { duration_min: number | null }).duration_min,
    sets: ((s as { exercise_logs: ExerciseSetRow[] }).exercise_logs ?? []).map(
      (e) => ({ exercise_id: e.exercise_id, reps: e.reps, weight_kg: e.weight_kg })
    ),
  }));

  // ── Planned sessions = program_days of the active program ─
  const { data: activeProgram } = await supabaseAdmin
    .from("workout_programs")
    .select("id, program_days(id)")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .maybeSingle();
  const sessionsPlanned = activeProgram
    ? ((activeProgram as { program_days: unknown[] }).program_days?.length ?? null)
    : null;

  // ── Prior bests (max weight per exercise BEFORE this week) ─
  const exerciseIds = [
    ...new Set(sessions.flatMap((s) => s.sets.map((st) => st.exercise_id))),
  ];
  const priorBests: Record<string, number> = {};
  const exerciseNames: Record<string, string> = {};
  if (exerciseIds.length > 0) {
    const { data: priorSessions } = await supabaseAdmin
      .from("workout_sessions")
      .select("id, exercise_logs(exercise_id, weight_kg)")
      .eq("client_id", clientId)
      .lt("session_date", weekStart);
    for (const ps of priorSessions ?? []) {
      for (const e of (ps as { exercise_logs: { exercise_id: string; weight_kg: number | null }[] }).exercise_logs ?? []) {
        if (e.weight_kg == null) continue;
        priorBests[e.exercise_id] = Math.max(priorBests[e.exercise_id] ?? 0, e.weight_kg);
      }
    }
    const { data: exRows } = await supabaseAdmin
      .from("exercises")
      .select("id, name")
      .in("id", exerciseIds);
    for (const ex of exRows ?? []) exerciseNames[ex.id as string] = ex.name as string;
  }

  // ── Measurements (latest in week + latest before) ────────
  const { data: measThis } = await supabaseAdmin
    .from("measurements")
    .select("waist_cm, body_fat_pct")
    .eq("client_id", clientId)
    .gte("meas_date", weekStart)
    .lte("meas_date", weekEnd)
    .order("meas_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: measPrev } = await supabaseAdmin
    .from("measurements")
    .select("waist_cm, body_fat_pct")
    .eq("client_id", clientId)
    .lt("meas_date", weekStart)
    .order("meas_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ── Check-in (in week) ──────────────────────────────────
  const { data: checkinRow } = await supabaseAdmin
    .from("checkins")
    .select(
      "overall_rating, energy_level, stress_level, motivation, appetite, adherence_diet_pct, adherence_training, what_went_well, challenges, goals_next_week, questions_for_coach"
    )
    .eq("client_id", clientId)
    .gte("checkin_date", weekStart)
    .lte("checkin_date", weekEnd)
    .maybeSingle();
  const checkin: CheckinEcho | null = checkinRow
    ? {
        overall: checkinRow.overall_rating,
        energy: checkinRow.energy_level,
        stress: checkinRow.stress_level,
        motivation: checkinRow.motivation,
        appetite: checkinRow.appetite,
        adherenceDietPct: checkinRow.adherence_diet_pct,
        adherenceTraining: checkinRow.adherence_training,
        whatWentWell: checkinRow.what_went_well,
        challenges: checkinRow.challenges,
        goalsNextWeek: checkinRow.goals_next_week,
        questionsForCoach: checkinRow.questions_for_coach,
      }
    : null;

  // ── Active phase ────────────────────────────────────────
  const { data: phaseRow } = await supabaseAdmin
    .from("phases")
    .select("name, type, target_kcal")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .maybeSingle();
  const phase: PhaseInfo | null = phaseRow
    ? { name: phaseRow.name, type: phaseRow.type, targetKcal: phaseRow.target_kcal }
    : null;

  // ── Compute ─────────────────────────────────────────────
  const metrics = computeMetrics({
    weekLogs: (weekLogs ?? []) as DailyLogRow[],
    prevLogs: (prevLogs ?? []) as DailyLogRow[],
    targets: client,
    sessions,
    sessionsPlanned,
    priorBests,
    exerciseNames,
    measurementThis: measThis ?? null,
    measurementPrev: measPrev ?? null,
    checkin,
    phase,
  });
  const flags = computeFlags(metrics);

  // ── AI narrative (skip if nothing logged) ────────────────
  let client_summary = "";
  let coach_summary = "";
  let ai_generated_at: string | null = null;
  if (metrics.daysLogged > 0) {
    try {
      const ai = await generateSummaries({ clientName, language, metrics, flags });
      client_summary = ai.client_summary;
      coach_summary = ai.coach_summary;
      ai_generated_at = new Date().toISOString();
    } catch (err) {
      console.error("AI summary failed for", clientId, err);
    }
  }

  // ── Upsert draft ────────────────────────────────────────
  const { data: saved, error } = await supabaseAdmin
    .from("weekly_reports")
    .upsert(
      {
        client_id: clientId,
        coach_id: client.coach_id,
        week_start: weekStart,
        week_end: weekEnd,
        status: "draft",
        language,
        metrics,
        flags,
        client_summary,
        coach_summary,
        ai_model: ai_generated_at ? REPORT_MODEL : null,
        ai_generated_at,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,week_start" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return saved as WeeklyReportRow;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/push.ts lib/reports/generate.ts
git commit -m "feat(reports): generation orchestrator + push helper"
```

---

## Task 10: `actions/reports.ts`

**Files:**
- Create: `actions/reports.ts`

- [ ] **Step 1: Write the actions**

`actions/reports.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireCoach, requireCoachOwnsClient } from "@/lib/auth/require-coach";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { todayCET } from "@/lib/date";
import { generateReportForClient } from "@/lib/reports/generate";
import { sendPushToClient } from "@/lib/push";
import type { WeeklyReportRow } from "@/lib/reports/types";

export async function generateNow(
  clientId: string
): Promise<{ data?: WeeklyReportRow; error?: string }> {
  const auth = await requireCoachOwnsClient(clientId);
  if (auth.error) return { error: auth.error };
  try {
    const report = await generateReportForClient(clientId, todayCET());
    revalidatePath("/coach/reports");
    return { data: report };
  } catch (err) {
    console.error("generateNow error:", err);
    return { error: "generateFailed" };
  }
}

export async function regenerateReport(
  reportId: string
): Promise<{ data?: WeeklyReportRow; error?: string }> {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data: rep } = await supabaseAdmin
    .from("weekly_reports")
    .select("id, client_id, week_start, status, coach_id")
    .eq("id", reportId)
    .maybeSingle();
  if (!rep) return { error: "notFound" };
  if (rep.coach_id !== auth.user.id) return { error: "unauthenticated" };
  if (rep.status === "published") return { error: "alreadyPublished" };

  try {
    const report = await generateReportForClient(rep.client_id, rep.week_start);
    revalidatePath(`/coach/reports/${reportId}`);
    return { data: report };
  } catch (err) {
    console.error("regenerateReport error:", err);
    return { error: "generateFailed" };
  }
}

export async function releaseReport(
  reportId: string,
  payload: { clientSummary: string; coachNote: string }
): Promise<{ success?: true; error?: string }> {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data: rep } = await supabaseAdmin
    .from("weekly_reports")
    .select("id, client_id, coach_id, language")
    .eq("id", reportId)
    .maybeSingle();
  if (!rep) return { error: "notFound" };
  if (rep.coach_id !== auth.user.id) return { error: "unauthenticated" };

  const { error } = await supabaseAdmin
    .from("weekly_reports")
    .update({
      client_summary: payload.clientSummary,
      coach_note: payload.coachNote,
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) {
    console.error("releaseReport error:", error);
    return { error: "releaseFailed" };
  }

  const copy =
    rep.language === "en"
      ? { title: "Your weekly report is ready", body: "Tap to see your week in review." }
      : { title: "Tvoj tjedni izvještaj je spreman", body: "Otvori i pogledaj svoj tjedan." };
  await sendPushToClient(rep.client_id, copy.title, copy.body);

  revalidatePath("/coach/reports");
  revalidatePath(`/coach/reports/${reportId}`);
  revalidatePath("/app/reports");
  return { success: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add actions/reports.ts
git commit -m "feat(reports): coach actions — generate/regenerate/release"
```

---

## Task 11: Cron route + `vercel.json`

**Files:**
- Create: `app/api/cron/weekly-reports/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Write the cron route**

`app/api/cron/weekly-reports/route.ts`:
```ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { todayCET } from "@/lib/date";
import { generateReportForClient } from "@/lib/reports/generate";

export const dynamic = "force-dynamic";
// Vercel Hobby caps function duration at 60s; Pro allows more. One client = one
// quick AI call, so 60s is plenty now. If the client count grows large, batch
// the loop or move generation to a queue (see plan "out of scope / scale").
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = todayCET();
  const { data: clients, error } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("is_active", true);
  if (error) {
    console.error("cron: failed to list clients", error);
    return NextResponse.json({ error: "listFailed" }, { status: 500 });
  }

  let generated = 0;
  const failures: string[] = [];
  for (const c of clients ?? []) {
    try {
      await generateReportForClient(c.id as string, today);
      generated++;
    } catch (err) {
      console.error("cron: report failed for", c.id, err);
      failures.push(c.id as string);
    }
  }

  return NextResponse.json({ generated, failures });
}
```

- [ ] **Step 2: Write `vercel.json`**

`vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-reports",
      "schedule": "0 18 * * 0"
    }
  ]
}
```
(`0 18 * * 0` = Sundays 18:00 UTC ≈ 20:00 Europe/Zagreb in summer / 19:00 in winter. Vercel automatically sends `Authorization: Bearer $CRON_SECRET`.)

- [ ] **Step 3: Verify the secret gate locally**

Start dev server (preview_start), then:
Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/cron/weekly-reports`
Expected: `401` (no/incorrect bearer).

Run: `curl -s -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env.local | cut -d= -f2)" http://localhost:3000/api/cron/weekly-reports`
Expected: `200` with JSON like `{"generated":1,"failures":[]}` (after the test client has logs — see Task 16; before that it still returns 200).

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/weekly-reports/route.ts vercel.json
git commit -m "feat(reports): Sunday cron trigger"
```

> **Deploy note (do with Igor at the end):** add `ANTHROPIC_API_KEY` and `CRON_SECRET` to Vercel Project → Settings → Environment Variables (Production), then redeploy so the cron registers.

---

## Task 12: i18n strings

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/hr.json`

- [ ] **Step 1: Add the `reports` namespace + nav labels to `messages/en.json`**

Add `"reports"` as a new top-level key, and add `reports` inside `app.nav` and `coach.nav`:

In `app.nav`, add: `"reports": "Reports"`.
In `coach.nav`, add: `"reports": "Reports"`.
New top-level block:
```json
"reports": {
  "title": "Weekly Reports",
  "weekOf": "Week of {date}",
  "empty": "No reports yet. Your coach will send your first weekly report soon.",
  "coachEmpty": "No reports generated yet.",
  "draft": "Draft",
  "published": "Published",
  "released": "Released",
  "generateNow": "Generate now",
  "regenerate": "Regenerate",
  "release": "Release to client",
  "coachNote": "Personal note to client",
  "coachNotePlaceholder": "Add a personal message (optional)…",
  "clientSummary": "Client summary",
  "coachSummary": "Coach summary",
  "flags": "Flags",
  "personalBests": "Personal bests",
  "checkinAnswers": "Client check-in",
  "overview": "This week",
  "history": "History",
  "metrics": {
    "weight": "Weight",
    "calories": "Calories",
    "protein": "Protein",
    "steps": "Steps",
    "sleep": "Sleep",
    "energy": "Energy",
    "adherence": "Meal plan",
    "training": "Training",
    "vsLastWeek": "vs last week",
    "vsTarget": "target",
    "daysLogged": "{n} of 7 days logged",
    "sessions": "{done} of {planned} sessions",
    "noData": "Not enough data this week"
  },
  "errors": {
    "generateFailed": "Could not generate the report. Try again.",
    "releaseFailed": "Could not release the report. Try again.",
    "alreadyPublished": "This report is already published.",
    "notFound": "Report not found.",
    "loadFailed": "Could not load reports."
  }
}
```

- [ ] **Step 2: Add the same keys to `messages/hr.json` (Croatian)**

In `app.nav`, add: `"reports": "Izvještaji"`.
In `coach.nav`, add: `"reports": "Izvještaji"`.
New top-level block:
```json
"reports": {
  "title": "Tjedni izvještaji",
  "weekOf": "Tjedan od {date}",
  "empty": "Još nema izvještaja. Tvoj trener uskoro šalje prvi tjedni izvještaj.",
  "coachEmpty": "Još nije generiran nijedan izvještaj.",
  "draft": "Skica",
  "published": "Objavljeno",
  "released": "Poslano",
  "generateNow": "Generiraj sada",
  "regenerate": "Ponovno generiraj",
  "release": "Pošalji klijentu",
  "coachNote": "Osobna poruka klijentu",
  "coachNotePlaceholder": "Dodaj osobnu poruku (nije obavezno)…",
  "clientSummary": "Sažetak za klijenta",
  "coachSummary": "Sažetak za trenera",
  "flags": "Upozorenja",
  "personalBests": "Osobni rekordi",
  "checkinAnswers": "Check-in klijenta",
  "overview": "Ovaj tjedan",
  "history": "Povijest",
  "metrics": {
    "weight": "Težina",
    "calories": "Kalorije",
    "protein": "Proteini",
    "steps": "Koraci",
    "sleep": "San",
    "energy": "Energija",
    "adherence": "Plan prehrane",
    "training": "Trening",
    "vsLastWeek": "vs prošli tjedan",
    "vsTarget": "cilj",
    "daysLogged": "{n} od 7 dana uneseno",
    "sessions": "{done} od {planned} treninga",
    "noData": "Nedovoljno podataka ovaj tjedan"
  },
  "errors": {
    "generateFailed": "Izvještaj nije moguće generirati. Pokušaj ponovno.",
    "releaseFailed": "Izvještaj nije moguće poslati. Pokušaj ponovno.",
    "alreadyPublished": "Ovaj izvještaj je već objavljen.",
    "notFound": "Izvještaj nije pronađen.",
    "loadFailed": "Izvještaje nije moguće učitati."
  }
}
```

- [ ] **Step 3: Validate both JSON files parse**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json')); JSON.parse(require('fs').readFileSync('messages/hr.json')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/hr.json
git commit -m "i18n(reports): add reports namespace + nav labels"
```

---

## Task 13: Shared UI — `report-metrics.tsx` + `flag-list.tsx`

**Files:**
- Create: `components/reports/report-metrics.tsx`
- Create: `components/reports/flag-list.tsx`

- [ ] **Step 1: Write the flag list**

`components/reports/flag-list.tsx`:
```tsx
"use client";

import type { Flag } from "@/lib/reports/types";

const TONE: Record<Flag["severity"], string> = {
  info: "var(--ink-3)",
  warn: "var(--warn)",
  danger: "var(--danger)",
};

export function FlagList({ flags, locale }: { flags: Flag[]; locale: "hr" | "en" }) {
  if (!flags.length) return null;
  return (
    <ul className="flex flex-col gap-2">
      {flags.map((f) => (
        <li key={f.key} className="flex items-start gap-2 text-[13px] text-ink-2">
          <span
            aria-hidden
            className="mt-[6px] size-1.5 shrink-0 rounded-full"
            style={{ background: TONE[f.severity] }}
          />
          <span>{locale === "en" ? f.text_en : f.text_hr}</span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Write the metrics view**

`components/reports/report-metrics.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import type { WeeklyMetrics, MetricPair } from "@/lib/reports/types";

const tooltipStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--hairline-2)",
  borderRadius: "8px",
  fontSize: "11px",
  color: "var(--ink)",
  padding: "6px 10px",
  fontFamily: "var(--font-geist-mono)",
};
const axisTickStyle = { fontSize: 10, fill: "var(--ink-3)", fontFamily: "var(--font-geist-mono)" };

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${dt.getDate()}.${dt.getMonth() + 1}.`;
}

function Delta({ pair, invert = false }: { pair: MetricPair; invert?: boolean }) {
  if (pair.value == null || pair.prev == null) return null;
  const diff = Math.round((pair.value - pair.prev) * 10) / 10;
  if (diff === 0) return <span className="text-ink-3">—</span>;
  const good = invert ? diff < 0 : diff > 0;
  return (
    <span style={{ color: good ? "var(--good)" : "var(--warn)" }}>
      {diff > 0 ? "↑" : "↓"} {Math.abs(diff)}
    </span>
  );
}

function Stat({
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

export function ReportMetrics({ metrics, locale }: { metrics: WeeklyMetrics; locale: "hr" | "en" }) {
  const t = useTranslations("reports.metrics");
  const tr = useTranslations("reports");
  const m = metrics;
  const num = (n: number | null, dp = 0) => (n == null ? "—" : n.toFixed(dp));

  const weightData = m.daily.filter((d) => d.weightKg != null);
  const caloriesData = m.daily.filter((d) => d.calories != null);
  const stepsData = m.daily.filter((d) => d.steps != null);

  return (
    <div className="flex flex-col gap-5">
      <div className="text-[12px] text-ink-3 font-mono">
        {t("daysLogged", { n: m.daysLogged })}
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label={t("weight")}
          value={`${num(m.weight.end, 1)} kg`}
          sub={m.weight.targetWeightKg != null ? `${t("vsTarget")} ${m.weight.targetWeightKg} kg` : undefined}
          delta={m.weight.changeKg != null ? (
            <span style={{ color: (m.phase?.type === "muscle_gain" ? m.weight.changeKg > 0 : m.weight.changeKg < 0) ? "var(--good)" : "var(--warn)" }}>
              {m.weight.changeKg > 0 ? "+" : ""}{m.weight.changeKg} kg
            </span>
          ) : undefined}
        />
        <Stat label={t("calories")} value={num(m.calories.value)}
          sub={m.calories.target ? `${t("vsTarget")} ${m.calories.target}` : undefined}
          delta={<Delta pair={m.calories} />} />
        <Stat label={t("protein")} value={`${num(m.protein.value)} g`}
          sub={m.protein.target ? `${t("vsTarget")} ${m.protein.target} g` : undefined}
          delta={<Delta pair={m.protein} />} />
        <Stat label={t("steps")} value={num(m.steps.value)}
          sub={m.steps.target ? `${t("vsTarget")} ${m.steps.target}` : undefined}
          delta={<Delta pair={m.steps} />} />
        <Stat label={t("sleep")} value={`${num(m.sleepH.value, 1)} h`}
          delta={<Delta pair={m.sleepH} />} />
        <Stat label={t("adherence")}
          value={m.mealPlanAdherencePct == null ? "—" : `${m.mealPlanAdherencePct}%`} />
        <Stat label={t("training")}
          value={m.training.sessionsPlanned != null
            ? t("sessions", { done: m.training.sessionsDone, planned: m.training.sessionsPlanned })
            : String(m.training.sessionsDone)} />
        <Stat label={t("energy")} value={num(m.energy.value, 1)} delta={<Delta pair={m.energy} />} />
      </div>

      {/* Personal bests */}
      {m.training.personalBests.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">★ {tr("personalBests")}</div>
          <ul className="mt-2 flex flex-col gap-1 text-[13px] text-ink">
            {m.training.personalBests.map((pb, i) => (
              <li key={i}>{pb.exercise}: <b>{pb.weightKg} kg</b> × {pb.reps}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Weight chart */}
      {weightData.length >= 2 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{t("weight")}</div>
          <div className="mt-3 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightData.map((d) => ({ date: fmtDate(d.date), weight: d.weightKg }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rptWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--lime)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--lime)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
                <XAxis dataKey="date" tick={axisTickStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} width={32} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
                <Area type="monotone" dataKey="weight" stroke="var(--lime)" strokeWidth={2} fill="url(#rptWeight)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Calories chart with target line */}
      {caloriesData.length >= 2 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{t("calories")}</div>
          <div className="mt-3 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={caloriesData.map((d) => ({ date: fmtDate(d.date), calories: d.calories }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
                <XAxis dataKey="date" tick={axisTickStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
                {m.calories.target != null && (
                  <ReferenceLine y={m.calories.target} stroke="var(--ink-3)" strokeDasharray="4 4" />
                )}
                <Line type="monotone" dataKey="calories" stroke="var(--carb)" strokeWidth={2} dot={{ r: 2, fill: "var(--carb)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Steps chart */}
      {stepsData.length >= 2 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{t("steps")}</div>
          <div className="mt-3 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stepsData.map((d) => ({ date: fmtDate(d.date), steps: d.steps }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
                <XAxis dataKey="date" tick={axisTickStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
                <Bar dataKey="steps" fill="var(--violet)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Visual verification happens in Tasks 14–16 via the preview tools.)

- [ ] **Step 4: Commit**

```bash
git add components/reports/report-metrics.tsx components/reports/flag-list.tsx
git commit -m "feat(reports): shared metrics + flags UI"
```

---

## Task 14: Client UI — list + detail + nav tab

**Files:**
- Create: `app/app/reports/page.tsx`
- Create: `app/app/reports/[id]/page.tsx`
- Modify: `app/app/layout.tsx`

- [ ] **Step 1: Client report list page**

`app/app/reports/page.tsx`:
```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/athletic/empty-state";
import { MicroLabel } from "@/components/ui/athletic/micro-label";

export default async function ClientReportsPage() {
  const t = await getTranslations("reports");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: reports } = user
    ? await supabase
        .from("weekly_reports")
        .select("id, week_start, week_end, published_at")
        .eq("client_id", user.id)
        .eq("status", "published")
        .order("week_start", { ascending: false })
    : { data: [] };

  return (
    <div className="px-5 pt-5 pb-6">
      <MicroLabel>~/Reports</MicroLabel>
      <h1 className="mt-1 mb-5 text-[28px] font-semibold leading-tight text-ink tracking-tight">
        {t("title")}
      </h1>

      {!reports?.length ? (
        <EmptyState glyph="◔" label={t("empty")} hint="" />
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`/app/reports/${r.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-surface-2/60"
              >
                <span className="text-[15px] font-medium text-ink">
                  {t("weekOf", { date: formatWeek(r.week_start, r.week_end) })}
                </span>
                <span aria-hidden className="text-ink-3">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatWeek(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return `${s.getDate()}.${s.getMonth() + 1}. – ${e.getDate()}.${e.getMonth() + 1}.`;
}
```

- [ ] **Step 2: Client report detail page**

`app/app/reports/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ReportMetrics } from "@/components/reports/report-metrics";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import type { WeeklyReportRow } from "@/lib/reports/types";

export default async function ClientReportDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("reports");
  const locale = (await getLocale()) === "en" ? "en" : "hr";
  const supabase = await createClient();

  // RLS guarantees: own + published only.
  const { data } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const report = data as WeeklyReportRow;

  return (
    <div className="px-5 pt-5 pb-10">
      <MicroLabel>~/Reports</MicroLabel>
      <h1 className="mt-1 mb-1 text-[26px] font-semibold leading-tight text-ink tracking-tight">
        {t("weekOf", { date: formatWeek(report.week_start, report.week_end) })}
      </h1>

      {report.coach_note && (
        <div className="my-4 rounded-xl border border-lime/30 bg-lime/5 p-4 text-[14px] leading-relaxed text-ink">
          {report.coach_note}
        </div>
      )}

      {report.client_summary && (
        <div className="my-4 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">
          {report.client_summary}
        </div>
      )}

      <ReportMetrics metrics={report.metrics} locale={locale} />
    </div>
  );
}

function formatWeek(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return `${s.getDate()}.${s.getMonth() + 1}. – ${e.getDate()}.${e.getMonth() + 1}.`;
}
```

- [ ] **Step 3: Add the Reports tab to the client nav**

In `app/app/layout.tsx`, add an entry to the `tabs` array (after `checkin`):
```ts
  { key: "reports", route: "/app/reports", glyph: "◔", hotkey: "E" },
```
Resulting array order: home, log, workout, checkin, **reports**, profile. (The `t("reports")` label resolves from the `app.nav.reports` key added in Task 12. Hotkey `E` is unused by the client nav.)

- [ ] **Step 4: Verify in the browser**

Ensure dev server running (preview_start). Then:
1. preview_eval `window.location.href = '/app/reports'` (logged in as the client/coach-as-client).
2. preview_console_logs — expect no errors.
3. preview_snapshot — expect the "Reports" heading and the empty-state (`reports.empty`) until a report is released.
4. preview_screenshot for a visual record.

- [ ] **Step 5: Commit**

```bash
git add app/app/reports app/app/layout.tsx
git commit -m "feat(reports): client report list + detail + nav tab"
```

---

## Task 15: Coach UI — overview/drafts + review/release

**Files:**
- Create: `app/coach/reports/page.tsx`
- Create: `app/coach/reports/[id]/page.tsx`
- Create: `app/coach/reports/[id]/review-form.tsx`
- Modify: `components/coach-shell/coach-shell.tsx`
- Modify: `app/coach/clients/[id]/page.tsx`

- [ ] **Step 1: Coach reports overview page**

`app/coach/reports/page.tsx`:
```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireCoach } from "@/lib/auth/require-coach";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { todayCET } from "@/lib/date";
import { weekBounds } from "@/lib/reports/week";
import type { WeeklyReportRow } from "@/lib/reports/types";

export default async function CoachReportsPage() {
  const t = await getTranslations("reports");
  const auth = await requireCoach();
  if (auth.error) return null; // middleware already gates /coach

  const { weekStart } = weekBounds(todayCET());

  const { data: rows } = await supabaseAdmin
    .from("weekly_reports")
    .select("id, client_id, week_start, week_end, status, flags, metrics, published_at")
    .eq("coach_id", auth.user.id)
    .order("week_start", { ascending: false })
    .limit(60);
  const reports = (rows ?? []) as Pick<WeeklyReportRow, "id" | "client_id" | "week_start" | "week_end" | "status" | "flags" | "metrics" | "published_at">[];

  // names
  const ids = [...new Set(reports.map((r) => r.client_id))];
  const { data: profs } = ids.length
    ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] };
  const nameOf = new Map((profs ?? []).map((p) => [p.id, p.full_name as string]));

  const thisWeek = reports.filter((r) => r.week_start === weekStart);
  const history = reports.filter((r) => r.week_start !== weekStart);

  return (
    <div className="px-5 py-6 lg:px-8">
      <h1 className="mb-5 text-[24px] font-semibold text-ink tracking-tight">{t("title")}</h1>

      <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">{t("overview")}</h2>
      {!thisWeek.length ? (
        <p className="text-[13px] text-ink-3">{t("coachEmpty")}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-[13px]">
            <tbody>
              {thisWeek.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/coach/reports/${r.id}`} className="font-medium text-ink hover:text-lime">
                      {nameOf.get(r.client_id) ?? "—"}
                    </Link>
                  </td>
                  <td className="px-2 py-3 text-ink-2">
                    {r.metrics.weight?.changeKg != null ? `${r.metrics.weight.changeKg > 0 ? "+" : ""}${r.metrics.weight.changeKg} kg` : "—"}
                  </td>
                  <td className="px-2 py-3 text-ink-2">
                    {r.metrics.mealPlanAdherencePct != null ? `${r.metrics.mealPlanAdherencePct}%` : "—"}
                  </td>
                  <td className="px-2 py-3">
                    {r.flags?.length ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px]"
                        style={{ background: "color-mix(in srgb, var(--warn) 15%, transparent)", color: "var(--warn)" }}
                      >
                        {r.flags.length}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="font-mono text-[10px] uppercase tracking-wide"
                      style={{ color: r.status === "published" ? "var(--good)" : "var(--ink-3)" }}
                    >
                      {r.status === "published" ? t("released") : t("draft")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {history.length > 0 && (
        <>
          <h2 className="mb-2 mt-7 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">{t("history")}</h2>
          <ul className="flex flex-col gap-2">
            {history.map((r) => (
              <li key={r.id}>
                <Link href={`/coach/reports/${r.id}`} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5 hover:bg-surface-2/60">
                  <span className="text-[13px] text-ink">{nameOf.get(r.client_id) ?? "—"}</span>
                  <span className="font-mono text-[11px] text-ink-3">{r.week_start}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Coach review page (server) + form (client)**

`app/coach/reports/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireCoach } from "@/lib/auth/require-coach";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { WeeklyReportRow } from "@/lib/reports/types";
import { ReviewForm } from "./review-form";

export default async function CoachReportReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getTranslations("reports"); // ensures namespace available server-side
  const auth = await requireCoach();
  if (auth.error) return null;

  const { data } = await supabaseAdmin
    .from("weekly_reports")
    .select("*")
    .eq("id", id)
    .eq("coach_id", auth.user.id)
    .maybeSingle();
  if (!data) notFound();

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", (data as WeeklyReportRow).client_id)
    .maybeSingle();

  return (
    <ReviewForm
      report={data as WeeklyReportRow}
      clientName={prof?.full_name ?? "—"}
    />
  );
}
```

`app/coach/reports/[id]/review-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { regenerateReport, releaseReport } from "@/actions/reports";
import { translateError } from "@/lib/translate-error";
import { ReportMetrics } from "@/components/reports/report-metrics";
import { FlagList } from "@/components/reports/flag-list";
import type { WeeklyReportRow } from "@/lib/reports/types";

export function ReviewForm({
  report,
  clientName,
}: {
  report: WeeklyReportRow;
  clientName: string;
}) {
  const t = useTranslations("reports");
  const tErr = useTranslations("reports.errors");
  const tCommon = useTranslations("errors");
  const router = useRouter();
  const locale = report.language;

  const published = report.status === "published";
  const [clientSummary, setClientSummary] = useState(report.client_summary ?? "");
  const [coachNote, setCoachNote] = useState(report.coach_note ?? "");
  const [pending, start] = useTransition();

  function onRegenerate() {
    start(async () => {
      const res = await regenerateReport(report.id);
      if (res.error) toast.error(translateError(res.error, tErr, tCommon));
      else {
        setClientSummary(res.data?.client_summary ?? "");
        toast.success(t("regenerate"));
        router.refresh();
      }
    });
  }

  function onRelease() {
    start(async () => {
      const res = await releaseReport(report.id, { clientSummary, coachNote });
      if (res.error) toast.error(translateError(res.error, tErr, tCommon));
      else {
        toast.success(t("released"));
        router.refresh();
      }
    });
  }

  return (
    <div className="px-5 py-6 lg:px-8 max-w-[640px]">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
        {clientName} · {report.week_start} – {report.week_end} ·{" "}
        <span style={{ color: published ? "var(--good)" : "var(--ink-3)" }}>
          {published ? t("released") : t("draft")}
        </span>
      </div>
      <h1 className="mb-5 text-[22px] font-semibold text-ink tracking-tight">{t("title")}</h1>

      {report.flags.length > 0 && (
        <section className="mb-5 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{t("flags")}</div>
          <FlagList flags={report.flags} locale={locale} />
        </section>
      )}

      {report.coach_summary && (
        <section className="mb-5 rounded-xl border border-border bg-card p-4">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{t("coachSummary")}</div>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">{report.coach_summary}</p>
        </section>
      )}

      {/* Editable client-facing summary */}
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{t("clientSummary")}</label>
      <textarea
        value={clientSummary}
        onChange={(e) => setClientSummary(e.target.value)}
        disabled={published || pending}
        rows={8}
        className="mb-4 w-full rounded-xl border border-border bg-card p-3 text-[14px] leading-relaxed text-ink outline-none focus:border-lime disabled:opacity-60"
      />

      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{t("coachNote")}</label>
      <textarea
        value={coachNote}
        onChange={(e) => setCoachNote(e.target.value)}
        disabled={published || pending}
        rows={3}
        placeholder={t("coachNotePlaceholder")}
        className="mb-5 w-full rounded-xl border border-border bg-card p-3 text-[14px] text-ink outline-none focus:border-lime disabled:opacity-60"
      />

      {!published && (
        <div className="mb-7 flex gap-3">
          <button
            onClick={onRegenerate}
            disabled={pending}
            className="rounded-lg border border-border px-4 py-2 text-[13px] text-ink-2 hover:bg-surface-2 disabled:opacity-50"
          >
            {t("regenerate")}
          </button>
          <button
            onClick={onRelease}
            disabled={pending}
            className="rounded-lg bg-lime px-4 py-2 text-[13px] font-medium text-bg hover:opacity-90 disabled:opacity-50"
          >
            {t("release")}
          </button>
        </div>
      )}

      {report.metrics.checkin && (
        <section className="mb-5 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{t("checkinAnswers")}</div>
          <dl className="flex flex-col gap-2 text-[13px]">
            {report.metrics.checkin.whatWentWell && (
              <div className="flex gap-2"><dt className="text-ink-3">+</dt><dd className="text-ink-2">{report.metrics.checkin.whatWentWell}</dd></div>
            )}
            {report.metrics.checkin.challenges && (
              <div className="flex gap-2"><dt className="text-ink-3">!</dt><dd className="text-ink-2">{report.metrics.checkin.challenges}</dd></div>
            )}
            {report.metrics.checkin.questionsForCoach && (
              <div className="flex gap-2"><dt className="text-ink-3">?</dt><dd className="text-ink">{report.metrics.checkin.questionsForCoach}</dd></div>
            )}
          </dl>
        </section>
      )}

      <ReportMetrics metrics={report.metrics} locale={locale} />
    </div>
  );
}
```

- [ ] **Step 3: Add the Reports link to the coach nav**

In `components/coach-shell/coach-shell.tsx`:
1. Widen the `NavLink` type: change `labelKey: "clients" | "exercises" | "foods" | "meals";` to `labelKey: "clients" | "exercises" | "foods" | "meals" | "reports";`
2. Add to the `navLinks` array (after `meals`):
```ts
  { labelKey: "reports", route: "/coach/reports", hotkey: "R" },
```
(Hotkey `R` is unused by the coach nav. Label resolves from `coach.nav.reports` added in Task 12.)

- [ ] **Step 4: Link to the latest report from the client detail page**

In `app/coach/clients/[id]/page.tsx`, add a link to `/coach/reports` near the top of the client view (follow the existing link/section styling in that file). Minimal addition (place beside other client actions):
```tsx
<Link href="/coach/reports" className="text-[13px] text-lime hover:underline">
  {/* reports.title */}Reports →
</Link>
```
(If the file already imports `Link` and uses `getTranslations`, use `t("title")` from the `reports` namespace instead of the literal.)

- [ ] **Step 5: Verify in the browser**

Dev server running. As the coach:
1. preview_eval `window.location.href = '/coach/reports'`.
2. preview_console_logs — no errors.
3. preview_snapshot — expect the "Weekly Reports" heading, the "This week" section, and "No reports generated yet" until Task 16 generates one.

- [ ] **Step 6: Commit**

```bash
git add app/coach/reports components/coach-shell/coach-shell.tsx app/coach/clients/[id]/page.tsx
git commit -m "feat(reports): coach overview + review/release UI + nav"
```

---

## Task 16: Seed test data + end-to-end verification

**Files:** none (data + manual verification)

> Goal: prove the full flow on the real test client — generate → review → release → client view — and capture screenshots.

- [ ] **Step 1: Seed a realistic week for the test client**

The test client is the single row in `clients`. Get its id and the current week's Monday with the Supabase MCP `execute_sql`:
```sql
select id from clients limit 1;
```
Then seed 5 days of `daily_logs` across the current Mon–Sun week (replace `<CLIENT_ID>` and use this week's dates from `weekBounds(todayCET())`, e.g. 2026-05-25..2026-05-31):
```sql
insert into daily_logs (client_id, log_date, weight_kg, calories_kcal, protein_g, carbs_g, fat_g, steps, sleep_h, sleep_quality, energy_level, water_l, followed_meal_plan)
values
 ('<CLIENT_ID>','2026-05-25', 89.0, 2150, 175, 190, 68, 8200, 7.0, 7, 7, 2.5, true),
 ('<CLIENT_ID>','2026-05-26', 88.8, 2240, 168, 210, 72, 7600, 6.5, 6, 6, 2.2, true),
 ('<CLIENT_ID>','2026-05-27', 88.7, 2080, 182, 175, 64, 10300, 7.5, 8, 8, 3.0, false),
 ('<CLIENT_ID>','2026-05-29', 88.4, 2300, 170, 220, 75, 6900, 6.0, 5, 6, 2.0, true),
 ('<CLIENT_ID>','2026-05-31', 88.2, 2120, 178, 185, 66, 9100, 7.0, 7, 7, 2.6, true)
on conflict (client_id, log_date) do update set
  weight_kg=excluded.weight_kg, calories_kcal=excluded.calories_kcal, protein_g=excluded.protein_g,
  carbs_g=excluded.carbs_g, fat_g=excluded.fat_g, steps=excluded.steps, sleep_h=excluded.sleep_h,
  sleep_quality=excluded.sleep_quality, energy_level=excluded.energy_level, water_l=excluded.water_l,
  followed_meal_plan=excluded.followed_meal_plan;
```
(If `todayCET()` falls in a different week, use that week's Mon–Sun dates instead.)

- [ ] **Step 2: Generate the draft via the cron endpoint**

Dev server running, with `ANTHROPIC_API_KEY` set in `.env.local`:
Run: `curl -s -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env.local | cut -d= -f2)" http://localhost:3000/api/cron/weekly-reports`
Expected: `{"generated":1,"failures":[]}`.

Verify the row with Supabase MCP `execute_sql`:
```sql
select status, language, days := (metrics->>'daysLogged'), left(client_summary, 60) as summary, jsonb_array_length(flags) as flags
from weekly_reports order by generated_at desc limit 1;
```
Expected: `status=draft`, `daysLogged=5`, a non-empty `summary` (AI ran), `flags` ≥ 0.

- [ ] **Step 3: Review as coach**

1. preview_eval `window.location.href = '/coach/reports'` → preview_snapshot: the test client appears under "This week" with a weight delta and a "Draft" status.
2. Open the report (preview_click the client name or eval the URL `/coach/reports/<id>`).
3. preview_snapshot: coach summary, editable client summary, flags, metric cards, and charts render. preview_console_logs: no errors.
4. preview_screenshot for the record.

- [ ] **Step 4: Release**

1. Optionally edit the client summary / add a coach note (preview_fill on the textareas).
2. preview_click the "Release to client" button.
3. preview_snapshot: status flips to "Released"; textareas become disabled; buttons hidden.
4. Confirm in DB:
```sql
select status, published_at, left(coach_note,40) from weekly_reports order by generated_at desc limit 1;
```
Expected: `status=published`, `published_at` set.

- [ ] **Step 5: View as client**

1. preview_eval `window.location.href = '/app/reports'` → preview_snapshot: the released week appears in the list.
2. Open it → preview_snapshot: coach note (if added), narrative, metric cards, charts. preview_console_logs: no errors.
3. preview_screenshot for the record.

- [ ] **Step 6: Confirm the privacy gate**

While still on `/app/reports/<id>` as the client, generate a *second* draft for a different week (or re-run the cron after deleting the published row's `published_at`) and confirm a **draft** is NOT visible to the client: querying `/app/reports` shows only published items. (RLS test: `select count(*) from weekly_reports where status='draft'` returns rows, but the client list query filters to published.)

- [ ] **Step 7: Full checks + commit**

Run: `npx vitest run` → expected: all report tests pass.
Run: `npm run lint` → expected: no new errors.
Run: `npx tsc --noEmit` → expected: no errors.

```bash
git commit --allow-empty -m "test(reports): end-to-end verification complete"
```

> **Final deploy step (with Igor):** add `ANTHROPIC_API_KEY` + `CRON_SECRET` to Vercel env (Production), push the branch, open a PR, and after merge confirm the cron appears under Vercel → Project → Settings → Cron Jobs.

---

## Self-review notes (coverage against the spec)

- Spec §5 table → Task 1. §6 metrics → Task 5 (`computeMetrics`) + Task 9 (fetch). §7 flags → Task 6. §8 AI → Task 8. §9 isolation → Tasks 4–9 (pure core vs orchestrator). §10 actions → Task 10. §11 UI → Tasks 13–15. §12 notifications → Task 9 (`lib/push`) + Task 10 (client push on release); coach in-app indicator via the drafts list in Task 15 (see notification note). §13 edge cases → quiet-week guard in Task 9, immutability in Task 9 + Task 10, partial week via null-safe `computeMetrics`. §14 security → Task 1 RLS + Task 11 cron secret. §15 env → Task 7. §16 testing → Tasks 4–6 unit + Task 16 E2E. §17 out-of-scope respected (no email/PDF).
- Type consistency: `WeeklyMetrics`, `MetricPair`, `Flag`, `AiSummaries`, `WeeklyReportRow` defined once in Task 3 and imported everywhere; `computeMetrics` input shape matches the orchestrator's call in Task 9; `generateReportForClient(clientId, dateStr)` signature is identical across Tasks 9, 10, 11.
