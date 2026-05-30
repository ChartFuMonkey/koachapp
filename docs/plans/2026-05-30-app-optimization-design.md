# KoachApp — Full Optimization & Completion (Design Spec)

**Date:** 2026-05-30
**Status:** Approved direction, pending spec review
**Author:** Claude (with Igor)

## 1. Goal

Turn KoachApp from a phone-only, mostly-working build into a **complete, correct, fully adaptive, installable product** — across mobile, tablet, and desktop, for both the athlete app (Croatian) and the coach dashboard (English).

This is **completion and polish of a real app**, not a rebuild. The audit confirmed the app is genuinely wired to Supabase end-to-end; the work is to fix specific defects, replace placeholders with truth, make every screen adapt to its device, and make the PWA actually installable.

### Success criteria
1. Every number, button, form, chart, and upload reflects real data and actually works — nothing fake is ever shown to a user.
2. Every screen has a purpose-built layout at phone (<768px), tablet (768–1024px), and desktop (≥1024px) — no phone-strip-in-a-void, no cramped tables, no wasted space.
3. The app installs to the home screen on iOS and Android, works offline at the shell level, and its service worker survives production builds.
4. The existing "Athletic OS" dark/lime aesthetic and the EN/HR bilingual system are preserved throughout.

### Confirmed decisions
- **Sequence:** Phase 1 (fix functionality) → Phase 2 (adaptive layouts) → Phase 3 (PWA). Each phase is verified before the next begins.
- **Placeholders:** handled item-by-item — make real where genuinely useful, remove where not worth the complexity (rulings in §4.2).
- **Aesthetic:** keep Athletic OS; expand it to large screens, do not redesign.
- **Both surfaces** (athlete + coach) are in scope.

### Out of scope
- The half-planned **weekly-reports** feature (`docs/plans/2026-05-30-weekly-reports*.md`) — separate effort, untouched unless it directly conflicts.
- Net-new features beyond completing what the UI already implies.

## 2. Constraints & ground rules

- **Modified Next.js 16.2.2** (`AGENTS.md`): APIs differ from training data. Before writing code that touches any Next API (metadata, `viewport`, manifest route, routing, server actions), read the relevant guide under `node_modules/next/dist/docs/`.
- **All DB writes go through Server Actions** in `actions/`; the service-role key never reaches the browser. New writes follow this pattern.
- **RLS** is enforced at Supabase. New columns/tables must keep existing RLS guarantees (athlete sees only their own rows; coach via `is_coach()`).
- **Bilingual (next-intl).** Every user-facing string added or changed must be added to BOTH `messages/en.json` and `messages/hr.json`. No hardcoded UI copy.
- **DB schema changes** are applied via the Supabase MCP (`apply_migration`) against project `zyjwkdsulzosfuadnnwq`, and mirrored into `supabase/` migration files.
- **Env** (`.env.local`, verified present): Supabase URL/anon/service-role, `NEXT_PUBLIC_COACH_UUID`, VAPID public/private/subject, site URL. Vercel env must mirror these.
- **Verification after every phase:** boot the dev server, sign in as coach and as an athlete, walk the screens at 390 / 834 / 1440px, screenshot, and check the console/network for errors. No phase is "done" without this evidence.

## 3. Architecture overview

Three independent layers, built in order. Phase 2 builds shared primitives **once** and applies them everywhere (the reason "fixes → layouts → PWA" beats surface-by-surface: the responsive foundation isn't rebuilt per screen).

```
Phase 1  Correctness     → data fixes + server actions + targeted migrations
Phase 2  Adaptive UI     → shared primitives (container, table, dialog, nav) → applied per screen
Phase 3  PWA             → manifest/metadata/icons + Serwist service worker + offline
```

## 4. Phase 1 — Make everything truly work

### 4.1 Confirmed defects to fix (broken / wrong data)

| # | Defect | Location | Fix |
|---|--------|----------|-----|
| 1 | **Athlete targets are silently wrong.** Home + Daily Log select `clients.first_name` (column doesn't exist) → whole `clients` row errors → every target falls back to hardcoded defaults (2400 kcal, 180g P, …) and "DAY N"/greeting break. | `app/app/page.tsx:56-61,91,136-150`; `actions/daily-log.ts:100-113` | Remove `first_name` from selects; greeting uses `profiles.full_name` (as the rest of the app does). Verify real targets + `start_date` now render. **Highest priority.** |
| 2 | **Coach dashboard RPE is a dead query.** Selects `exercise_logs.client_id` (no such column) → "AVG RPE 7D" tile + per-row RPE always "—". | `app/coach/page.tsx:113-118` | Rewrite to join `exercise_logs → workout_sessions!inner(client_id)` and aggregate. |
| 3 | **Profile editing is non-functional.** `updateProfile` exists but has zero callers; account menu anchors (`#targets`/`#dob`/`#language`) point at nonexistent IDs. | `app/app/profile/page.tsx:147-152,275-286`; `actions/profile.ts:31` | Build a real edit form (name/height/DOB/gender) bound to `updateProfile`; wire the menu rows to real targets (scroll/route or open the form). |
| 4 | **Photo "Other" angle always fails.** UI offers "Other"; server `ALLOWED_ANGLES` rejects it. | `app/app/photos/page.tsx:49-54`; `actions/photos.ts:7,94` | Add `"other"` to `ALLOWED_ANGLES` and the filename map. |
| 5 | **Check-in week query is fragile.** `.maybeSingle()` over a date range can throw PGRST116 (uniqueness is per-date, not per-week). | `actions/checkin.ts:39-45` | Order by date desc + `.limit(1)` then read first row. |

### 4.2 Placeholder rulings (item-by-item)

**Make real** (high value, acceptable cost):

| Item | Location | Decision |
|------|----------|----------|
| Coach dashboard RPE sparkline (was `Math.sin`) | `app/coach/page.tsx:212` | Real 7-day RPE series from the fixed query (#2). |
| Desktop roster filter chips (no-op; mobile ones work) | `app/coach/page.tsx:294-307` | Wire to the same triage filter the mobile roster already uses. |
| Per-exercise "done" pips (assume 4 sets) | `app/app/page.tsx:331-352` | Compute from real logged sets vs `program_exercises.sets`. |
| Program **coach note** (hardcoded text) | `program-builder.tsx:713-718` | Add `workout_programs.coach_note` (text) + editable field. |
| Program **goal + duration** ("WEEK 1/8", "HYPERTROPHY") | `program-builder.tsx:325-326` | Add `goal` + `total_weeks` columns; derive current week from `start_date`. |
| Phase **prescription targets** (protein/steps/cardio/lift-vol/weigh-ins hardcoded) | `phase-manager.tsx:197-212` | Add target columns to `phases`; surface in the phase create/edit form. Core coaching data. |
| Phase **editing** ("coming soon" no-op) | `phase-manager.tsx:317-327` | Add `updatePhase` action + edit form. |
| Exercise **"USED" count** (`usedCount=0` TODO) | `exercise-manager.tsx:324` | Real count of programs referencing the exercise (`program_exercises`). |
| Program **Duplicate** (disabled) | `program-builder.tsx:341` | Implement clone (program + days + exercises). |
| Exercise **video demo** (`video_url` fetched, never shown) | `workout/page.tsx`, `workout/log` | Add a "watch demo" link where `video_url` exists. |
| Meal-plan slot labels ("AM/13:00…", positional) | `meal-plan-builder.tsx:62-68` | Add optional `time` per `meal_plan_entries`; fall back to honest "Meal N". |
| Home meal checkbox (no-op) | `app/app/page.tsx:413` | Make it check off a meal as eaten, stored per day; **OR remove** if storage cost is high (decide during impl — default: remove, since daily-log already captures "followed meal plan"). |

**Remove** (low value or misleading; not worth backing with real data):

| Item | Location | Decision |
|------|----------|----------|
| Program **Save** button (redundant; saves are per-action) | `program-builder.tsx:344` | Remove. |
| Exercise **Import CSV** (disabled, sizable feature) | `exercise-manager.tsx:248` | Remove; note as future. |
| Exercise **usage sparkline** (`Math.sin` bars) | `exercise-manager.tsx:384-397` | Remove; keep the real "used in N" count. |
| Coach **"● online"** presence (static, no presence system) | `coach-shell.tsx:248,339`; top bar | Remove the "online" claim; keep a neutral brand dot. |
| Check-in **"SUNDAY REVIEW"** label (check-in allowed any day) | `checkin/page.tsx:113-115,187-189` | Relabel to "Weekly review" / "Week N" (keep real week number). |
| Phase **"KCAL Δ"** fixed strings | `phase-manager.tsx:51-68` | Compute from prior phase's kcal if available; else remove the delta. |
| Program **fake weekday spread** | `program-builder.tsx:62-71` | Replace with honest "Day N"; optional real weekday assignment as a stretch. |
| `meal-plan-today.tsx` (dead, imported nowhere) | component | Delete. |

**Keep as-is** (honest heuristics, not fake data): program "~N MIN" estimate (label as estimate), meal category chips derived from name.

### 4.3 Migrations (Phase 1)
New columns, one migration per concern, RLS-preserving:
- `workout_programs`: `coach_note text`, `goal text`, `total_weeks int`.
- `phases`: target columns (`target_protein_g`, `target_steps`, `cardio_note`, `lift_volume_note`, `weighin_freq`) — final list confirmed against the phase form during impl.
- `meal_plan_entries`: `time text null`.
- (Conditional) program-day `weekday` and a meal-completion store — only if those "make real" items survive the impl-time value/cost check.

## 5. Phase 2 — Adaptive layouts (mobile / tablet / desktop)

### 5.1 The core problem
The app has two conflicting responsive strategies. The athlete surface is hard-capped to a phone column (`max-w-[430px] lg:max-w-[480px] xl:max-w-[520px]`) with side rails only at `lg` — so **tablet (768–1024) is broken everywhere** (430px ribbon + bottom nav in a wide void) and desktop is a timid 520px column. The coach surface has a well-built adaptive shell but inconsistent per-screen padding/headlines and data tables that don't reflow (saved only by `overflow-x-auto`).

### 5.2 Breakpoint system (target end-state)
- **Mobile `<768` (`<md`):** current mobile-first layouts (they're good). Athlete: bottom nav. Coach: drawer.
- **Tablet `768–1024` (`md`):** the tier to build. Athlete: switch bottom-nav → side rail **at `md`**, widen content, activate the already-authored `md:` grids. Coach: tap-to-expand icon rail + a touch entry point for the command palette.
- **Desktop `≥1024` (`lg`):** athlete content grows into multi-column dashboards, right context rail retained; coach persistent sidebar (already correct), all pages on the shared container.
- **Wide `≥1280` (`xl`):** add a third grid column where it helps (progress charts, meals, etc.).

### 5.3 Shared primitives (build once)
1. **`<Screen>` container** — consistent `px-4 sm:px-6 lg:px-10` + responsive max-width tiers. Replaces the hard `max-w-[430px]` clamp and every bare `px-10`. Eliminates the dead `md:` rules currently defeated by the clamp.
2. **Responsive `<DataTable>`** — adopt/extend `components/ui/athletic/data-table.tsx`: real table at `md+`, stacked label/value cards below `md`. Apply to client-detail tabs (esp. the 10-col Measurements), program/meal food rows.
3. **Responsive dialog base** — generalize `message-dialog`'s bottom-sheet-on-phone / centered-modal-on-desktop pattern; adopt for `confirm-dialog` and `command-palette`.
4. **Athlete nav** — bottom nav (mobile) → labeled side rail at `md` → full rail + context rail at `lg`. Banners/nav stop being frozen at 430px.
5. **Coach shell touch fixes** — tap-to-expand `md` icon rail; mobile search trigger that opens the command palette.

### 5.4 Per-screen application (target layouts)
- **Athlete shell** (`app/app/layout.tsx`) — *first*, unblocks all 8 athlete screens.
- **Today** (`app/app/page.tsx`) — hero full-width; `md:grid-cols-2` (session+inbox); `lg:grid-cols-3` (+steps/sleep/meals).
- **Daily log** — 10 stat rows → `sm:grid-cols-2 lg:grid-cols-3`; sliders `lg:grid-cols-2`.
- **Progress** — charts → `lg:grid-cols-2` / `xl:grid-cols-3`, taller at `lg`.
- **Check-in** — textareas `lg:grid-cols-2`; submitted metrics up to `lg:grid-cols-4`.
- **Photos** — session list → `lg:grid-cols-2/3` gallery.
- **Workout / live-log** — keep the focused narrow column (correct even on desktop); center comfortably; optional `lg` "up next" side panel.
- **Coach client-detail** — `px-10` → `px-4 sm:px-6 lg:px-10`; tab tables → responsive `<DataTable>`.
- **Coach meal-plan-builder** — wrap header, scroll/wrap day strip, fix `px-10`/headline; most mobile-hostile screen.
- **Coach phases / meals / foods** — normalize to `px-4 sm:px-6 lg:px-10` + `text-[28px] sm:text-[36px]` + `flex-wrap` headers (copy roster/exercise-manager).
- **Roster, exercises, new-client, auth, landing** — already good; minor touch-ups only.

## 6. Phase 3 — Real, installable PWA

**P0 — installability (nothing else matters until these land):**
1. Link the manifest: `metadata.manifest` (or `app/manifest.ts`) in `app/layout.tsx`.
2. Add a `viewport` export: `viewportFit: "cover"`, `themeColor`, `width: device-width`, `initialScale: 1` — also fixes the safe-area insets currently no-op on iOS.
3. Add `appleWebApp` metadata (capable, status-bar style, title) + `apple-touch-icon` link.
4. Create `public/apple-touch-icon.png` (180×180).

**P1 — service-worker durability (biggest production risk):**
5. **Migrate next-pwa → Serwist (`@serwist/next`)** — maintained, Turbopack/Next-16-native, SW (incl. the existing push handler from `worker/index.ts`) authored in TypeScript; drop the `next build --webpack` pin.
6. Delete junk artifacts: `public/sw 2.js`–`sw 6.js` and the orphaned `public/worker-*.js`.

**P2 — production-quality install UX:**
7. Maskable icon (512 w/ safe zone, `purpose: maskable`) + a monochrome push badge icon.
8. Manifest `screenshots` (narrow + wide).
9. Offline fallback: `app/~offline` route wired as the SW navigation fallback.
10. `loading.tsx` on key route segments.

**P3 — polish:** manifest `id`/`scope`/`lang`/`categories`/`shortcuts`; broaden iOS detection in `install-banner.tsx` (iPadOS-13+); handle missing-VAPID gracefully.

Push notifications are already a complete RFC-compliant pipeline (`supabase/functions/send-push/index.ts`) — they just depend on the SW being live and the app being installed, both delivered by P0/P1.

## 7. Verification plan

Per phase, with evidence:
- **Build:** `next build` passes (with `--webpack` until the Serwist migration; standard after).
- **Live walkthrough:** dev server; sign in as coach and as an athlete; visit every screen at **390 / 834 / 1440px**; screenshot; zero console/network errors.
- **Phase 1 specifically:** confirm real targets render on Home/Daily-log; RPE shows real numbers; profile edit saves; photo "Other" uploads; placeholders are gone or real.
- **Phase 3 specifically:** Lighthouse PWA "installable"; manifest linked; iOS add-to-home-screen shows the right icon; offline navigation shows the branded fallback.

Use the `verification-before-completion` discipline: no "done" claim without command/screenshot evidence.

## 8. Risks
- **Schema changes** touch live data — apply additively (nullable columns, no destructive drops); back up via migration files.
- **Serwist migration** changes the build/SW pipeline — validate an installable production build before removing next-pwa.
- **i18n drift** — every string in both locale files; a missing key throws at runtime.
- **Modified Next 16** — read the bundled docs before each unfamiliar API; don't assume training-data behavior.
