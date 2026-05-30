# Weekly Report Redesign — Design Spec

**Date:** 2026-05-30
**Status:** Approved (design), pending implementation plan
**Feature:** Visually redesign the weekly report into clear sections (Nutrition, Training, Progress), add four progress graphs, and add one-click PDF download. Builds on the shipped weekly-reports feature (`2026-05-30-weekly-reports-design.md`).

---

## 1. Goal

Turn the current flat report (one stat grid + 3 charts + AI text) into a polished, sectioned report that reads like a professional coaching deliverable, shows real progress over time, and can be downloaded as a PDF. Applies to **both** the coach review screen and the client's view; stays bilingual (hr/en) and keeps the dark + lime "Athletic OS" aesthetic.

## 2. Locked decisions

- **Sections:** Nutrition, Training, Progress (plus a hero header + AI-summary callout + footer).
- **Four added graphs:** (1) multi-week weight trend toward goal, (2) strength progression of main lifts, (3) body-measurements trend (waist + body-fat %), (4) macros vs target. Existing calories-vs-target and steps charts are kept and restyled.
- **Trend data is baked into the report snapshot at generation time** (self-contained → reports are immutable and the PDF has everything). Not re-queried live.
- **PDF:** true one-click download via `html2canvas` + `jspdf` (captures the report exactly as designed).
- **Coach recommendations:** during review, the coach can add three structured recommendations — **Training**, **Nutrition**, **General** — which render in the report (in context) and are released to the client alongside the AI summary.
- **Scope:** the report's presentation + the data it carries + the three coach-recommendation fields. RLS, cron, and push are unchanged; the review/release flow gains the three inputs but is otherwise unchanged.

## 3. Data model — expand the `weekly_reports.metrics` snapshot

No DB schema change (metrics is `jsonb`). Extend the `WeeklyMetrics` shape:

### Add `trends`
```ts
export type TrendPoint = { weekStart: string; value: number };

export type Trends = {
  // Weekly average body weight, oldest→newest, last ~12 ISO weeks that have data.
  weightByWeek: TrendPoint[];
  // Newest ~8 measurement entries, oldest→newest.
  measurements: Array<{ date: string; waistCm: number | null; bodyFatPct: number | null }>;
  // Up to 4 most-trained lifts; weekly top set (max weight), oldest→newest, last ~12 weeks.
  strength: Array<{ exercise: string; points: TrendPoint[] }>;
};
```
Add `trends: Trends` to `WeeklyMetrics`.

### Extend `DailyPoint`
Add `followedMealPlan: boolean | null` (for the 7-day adherence dot strip).
```ts
export type DailyPoint = {
  date: string;
  weightKg: number | null;
  calories: number | null;
  steps: number | null;
  followedMealPlan: boolean | null; // NEW
};
```

> Goal progress (start → current → target), macros-vs-target, sessions, PBs, and the in-week dailies all use data **already** in the snapshot — no new fields needed for those.

### Coach recommendation columns (small migration)
`weekly_reports` is already deployed, so add three nullable text columns via a new migration `supabase/migrations/20260530_report_recommendations.sql`:
- `rec_training text`, `rec_nutrition text`, `rec_general text`

These are coach-authored at review time (not AI-generated) — generation leaves them `null`. The existing `coach_note` column is superseded by `rec_general` (left in place, unused, to avoid touching released rows). RLS is unchanged (new columns inherit the table's policies). Add the three fields to `WeeklyReportRow` in `lib/reports/types.ts`.

## 4. Computation — new pure `computeTrends`

`lib/reports/trends.ts` — a **pure, unit-tested** function (same pattern as `aggregate.ts`/`flags.ts`). The orchestrator fetches the history and passes raw rows in.

```ts
export function computeTrends(input: {
  weekStart: string;                 // current week's Monday
  weeksBack?: number;                // default 12
  dailyHistory: { log_date: string; weight_kg: number | null }[];
  measHistory: { meas_date: string; waist_cm: number | null; body_fat_pct: number | null }[];
  strengthHistory: { session_date: string; exercise_id: string; weight_kg: number | null }[];
  exerciseNames: Record<string, string>;
}): Trends
```

- **weightByWeek:** bucket `dailyHistory` into ISO weeks (Mon-anchored via `lib/reports/week.ts`), average non-null `weight_kg` per week, keep weeks that have data, oldest→newest, cap to the last `weeksBack` weeks ending at `weekStart`.
- **measurements:** sort `measHistory` ascending by date, take the last ~8, map to `{date, waistCm, bodyFatPct}`.
- **strength:** group `strengthHistory` by `exercise_id`; within each, bucket by ISO week and take the **max** `weight_kg` per week → points (oldest→newest). Select the top **4** exercises by number of distinct weeks with data (most consistently trained); map id→name; drop exercises with `<2` weeks of points.

## 5. Generation changes (`lib/reports/generate.ts`)

Fetch the history needed for trends, then call `computeTrends` and attach to `metrics.trends`. Also include `followedMealPlan` in `metrics.daily`.

New/extended queries (all via `supabaseAdmin`, scoped to the client):
- **Weight history:** `daily_logs(log_date, weight_kg)` for the last ~84 days (12 weeks) up to `weekEnd`.
- **Measurements history:** `measurements(meas_date, waist_cm, body_fat_pct)` ordered desc, limit ~8.
- **Strength history:** `workout_sessions(session_date, exercise_logs(exercise_id, weight_kg))` for the last ~84 days (reuse/extend the existing "prior sessions" fetch — add `session_date` and include this week). Exercise names already fetched for PRs; widen the `in(...)` set to all lifts in the history.

`computeMetrics` (in `aggregate.ts`) is extended only to add `followedMealPlan` to each `daily` point. `computeTrends` is invoked separately in `generate.ts` and the result merged into the returned metrics object.

## 6. UI redesign

Replace the single `report-metrics.tsx` with a **sectioned, composable** structure. New presentational component tree (all client components, CSS-var theming, recharts):

- `components/reports/report-view.tsx` — composes the whole report: **hero**, AI-summary callout, the three sections, footer (generated date + PDF button). Props: `{ report: WeeklyReportRow; locale }`. Read-only/presentational.
- `components/reports/sections/nutrition-section.tsx` — calories vs target + adherence %, **macro-vs-target bars**, **7-day adherence dots**, calories-vs-target chart.
- `components/reports/sections/training-section.tsx` — sessions done/planned, volume, duration, **personal bests**, **strength-progression chart**.
- `components/reports/sections/progress-section.tsx` — **weight-trend chart** + **goal progress bar**, **measurements-trend chart**, steps chart, sleep/energy mini-stats.
- `components/reports/charts/` — focused chart components: `weight-trend-chart.tsx`, `strength-chart.tsx`, `measurements-chart.tsx`, `macro-bars.tsx`, `calories-chart.tsx`, `steps-chart.tsx`. All set `isAnimationActive={false}` so PDF capture is reliable.
- `components/reports/parts/` — `stat-card.tsx`, `goal-progress-bar.tsx`, `adherence-dots.tsx`, `personal-bests.tsx`.
- `components/reports/download-pdf-button.tsx` — the PDF button (see §7).

**Consumers** (unchanged flow, swap the renderer):
- `app/app/reports/[id]/page.tsx` (client): renders `<ReportView>` instead of `<ReportMetrics>`.
- `app/coach/reports/[id]/review-form.tsx` (coach): edit controls become the editable AI summary + **three labeled recommendation textareas (Training / Nutrition / General)** + Release/Regenerate, plus flags, coach summary, and the client check-in. Renders `<ReportView>` below as the live preview. `releaseReport` (in `actions/reports.ts`) is extended to save `rec_training` / `rec_nutrition` / `rec_general`.
- `report-metrics.tsx` is removed (superseded); `flag-list.tsx` stays.

**Coach recommendations render in context** inside `ReportView` (read-only for the client): **General** in the top callout alongside the AI summary, **Nutrition** within the Nutrition section, **Training** within the Training section. Empty recommendations are omitted. Each is a clearly labeled block (icon + "Coach's recommendation" micro-label).

**Visual language:** section headers (mono micro-label + title + hairline divider), consistent rounded cards, lime accent, progress bars/rings, the existing `lib/metric-direction.ts` tone colors for deltas. Build with the `frontend-design` skill for polish. Charts use the established `tooltipStyle`/`axisTickStyle` pattern.

## 7. PDF export

`download-pdf-button.tsx` (client component):
- A `ref` wraps the printable area (the `ReportView` content, excluding nav/edit controls).
- On click: `html2canvas(node, { scale: 2, backgroundColor: <app bg>, useCORS: true })` → canvas; then `jspdf` lays the canvas onto A4, **slicing across multiple pages** if taller than one page.
- Download filename: `koachapp-report-<last-name>-<weekStart>.pdf`.
- Available on **both** coach and client report views.
- Charts render statically (`isAnimationActive={false}`) so they're captured fully; a short pre-capture tick ensures layout is settled.
- The download button itself (and any interactive controls) carry `data-html2canvas-ignore` so they do **not** appear inside the generated PDF.

New dependencies: `html2canvas`, `jspdf`.

**Alternatives considered:** `@react-pdf/renderer` (vector/selectable text, but requires rebuilding the entire layout in its own primitives and re-imaging charts — far more work) and print-CSS + `window.print()` (no library, but relies on the browser's print dialog rather than a true one-click download). `html2canvas`+`jspdf` reuses the on-screen design with the least rework.

## 8. Edge cases

- **Sparse history** (new client, few weeks): each trend chart renders only if it has ≥2 points, otherwise it's hidden (no broken/empty axes). Goal bar handles a missing target gracefully.
- **No measurements:** measurements-trend chart hidden.
- **No weighted lifts:** strength chart hidden.
- **Quiet week:** sections still render with the available numbers; the existing empty-summary behavior is unchanged.
- **PDF:** captures whatever is rendered; if a chart is hidden, the PDF simply omits it.

## 9. Testing

- **Unit:** `computeTrends` — weekly weight bucketing/averaging, strength weekly-max + top-4 selection + `<2`-week drop, measurement series ordering/cap. Extend `aggregate.test.ts` for the new `followedMealPlan` daily field.
- **Data check:** run the seeded **Marko Horvat** client through generation and confirm `metrics.trends` is populated (weight series across the 2 seeded weeks, strength points for the trained lifts, measurement series).
- **Visual/PDF:** verify on the deployed **preview** (charts render in each section, dark mode, mobile width; PDF downloads and looks right). Production build must pass.
- **Recommendations:** in the coach review, fill all three recommendation boxes, Release, and confirm they appear in the right places in the client's report view and in the PDF.

## 10. Out of scope (YAGNI)

- User-configurable/custom graphs; emailing or auto-attaching the PDF; server-side PDF rendering; cross-client comparisons; editing historical reports' trends.
