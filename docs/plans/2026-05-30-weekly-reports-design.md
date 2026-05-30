# Weekly Reports — Design Spec

**Date:** 2026-05-30
**Status:** Approved (design), pending implementation plan
**Feature:** Automated Sunday weekly reports for each client, reviewed by the coach, with AI-written summaries — surfaced to both coach and client.

---

## 1. Goal

Every Sunday, KoachApp automatically generates a comprehensive weekly report for each active client covering the past week (Monday–Sunday). The report compares **what the client actually did** against **their targets** and against **last week**, and includes an **AI-written coaching summary**.

Reports are generated as **drafts**. The coach reviews each one (edits AI wording, adds a personal note) and **releases** it. Only released reports become visible to the client.

## 2. Locked decisions

- **Review flow:** Coach-reviewed. Reports generate as drafts → coach edits + adds a note → releases → client sees it. Clients never see drafts.
- **AI depth:** AI coach summary + insights. The client report gets a warm narrative + next-week focus; the coach report gets a clinical summary + concern flags.
- **Scheduling host:** Vercel Cron (the app already runs on Vercel). The core generator is decoupled from the trigger so it can move to Supabase pg_cron later with no rework.
- **AI provider:** Claude (Anthropic), a fast low-cost model (default: Claude Haiku 4.5). Prompt caching on the shared system prompt.
- **Languages:** Each report's narrative is written in that user's `profiles.language` (`hr` | `en`).

## 3. Data we already capture (inputs)

All per-client data already exists in Supabase:

- **`daily_logs`** (one row per day): `weight_kg`, `calories_kcal`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, `water_l`, `steps`, `cardio_min`, `sleep_h`, `sleep_quality` (1–10), `energy_level` (1–10), `followed_meal_plan`, `notes`.
- **`clients`** (targets): `start_weight_kg`, `target_weight_kg`, `target_calories`, `target_protein_g`, `target_carbs_g`, `target_fat_g`, `target_steps`, `target_sleep_h`, `injuries`, `is_active`.
- **`checkins`** (manual weekly self-assessment, if submitted): `energy_level`, `stress_level`, `motivation`, `sleep_quality`, `appetite`, `adherence_diet_pct`, `adherence_training`, `what_went_well`, `challenges`, `goals_next_week`, `questions_for_coach`, `overall_rating`, `coach_notes`.
- **`workout_sessions`** + **`exercise_logs`**: sessions with `session_date`, `duration_min`; per-set `reps`, `weight_kg`, `rpe`.
- **`workout_programs` / `program_days` / `program_exercises`**: the active program → planned sessions/exercises (for "completed vs planned").
- **`measurements`**: body measurements (`waist_cm`, `chest_cm`, etc., `body_fat_pct`).
- **`phases`**: active training phase (`type`: fat_loss/muscle_gain/…, `target_kcal`) — context for the AI.

> The new feature **reads** all of the above; it does not change any existing table except adding the new `weekly_reports` table.

## 4. Week definition & schedule

- A report week is **Monday 00:00 → Sunday 23:59**, local (Europe/Zagreb).
- The cron runs **Sunday evening, Europe/Zagreb** (cron configured in UTC; ~20:00 local — exact minute is not critical because the coach reviews before release, and "Regenerate" re-pulls the latest data).
- `week_start` / `week_end` are stored as dates so reports are stable and queryable.

## 5. New data model

### Table: `weekly_reports`

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `client_id` | uuid → `clients(id)` | |
| `coach_id` | uuid → `profiles(id)` | denormalized for simple coach RLS/queries |
| `week_start` | date | Monday |
| `week_end` | date | Sunday |
| `status` | text | `draft` \| `published`, default `draft` |
| `language` | text | `hr` \| `en` snapshot at generation |
| `metrics` | jsonb | computed snapshot: this-week values, prior-week values, deltas, targets, training, measurements, check-in echo |
| `flags` | jsonb | rule-based concern flags: `[{ key, severity, text_hr, text_en }]` |
| `client_summary` | text | AI narrative for the client (coach-editable) |
| `coach_summary` | text | AI clinical summary for the coach |
| `coach_note` | text | personal note the coach adds at release |
| `ai_model` | text | model id used |
| `ai_generated_at` | timestamptz | |
| `generated_at` | timestamptz | default now() |
| `published_at` | timestamptz | set on release |
| `created_at` / `updated_at` | timestamptz | |

Constraints: `UNIQUE (client_id, week_start)` (one report per client per week; regeneration updates the row).

### RLS

- **Coach** (`coach_id = auth.uid()`): full read/write on their clients' reports, all statuses.
- **Client** (`client_id = auth.uid()`): `SELECT` only where `status = 'published'`.
- **Generation** runs via the **service-role** client (bypasses RLS) inside the secured cron route / coach actions.

## 6. Metrics computed per report

From `daily_logs` (week rows), with the same computation for the **prior week** to produce deltas:

- `days_logged` (count)
- **Weight:** first/last/avg this week; `weight_change_kg` (last − first, fallback to vs prior week's last); progress vs `start_weight_kg` and `target_weight_kg`
- **Nutrition:** avg `calories_kcal`, `protein_g`, `carbs_g`, `fat_g` vs targets; meal-plan adherence = % of logged days with `followed_meal_plan = true`
- **Activity:** avg & total `steps` vs `target_steps`; total `cardio_min`
- **Recovery:** avg `sleep_h` vs `target_sleep_h`; avg `sleep_quality`; avg `energy_level`; avg `water_l`

From `workout_sessions` + `exercise_logs` (week):
- `sessions_done` vs `sessions_planned` (count of `program_days` in active program)
- `total_volume_kg` = Σ(`reps` × `weight_kg`)
- **New personal bests:** per exercise, max `weight_kg` (or est. 1RM) this week vs best before this week → list
- total `duration_min`

From `measurements` (week): newest measurement + delta vs previous, if any.

From `checkins` (week): subjective ratings + free-text echoed into `metrics` (also shown raw on the coach report).

From `phases`: active phase name/type/target — passed to AI as context.

## 7. Flags (rule-based, deterministic)

Computed in code (not by AI) so they're reliable. Examples:
- `weight_stalled` — no meaningful change across N weeks while in a fat_loss/muscle_gain phase
- `low_logging` — `days_logged < 4`
- `missed_training` — `sessions_done == 0` (or well below planned)
- `sleep_low` — avg `sleep_h` well under target or trending down
- `calories_off_target` — avg calories far from target
- `open_question` — client left a `questions_for_coach` in their check-in

Each flag carries a severity and bilingual text. The AI may reference flags in prose, but the flags themselves are code-generated.

## 8. AI integration

- **Module:** `lib/reports/ai.ts`. Input = compact JSON of metrics + targets + deltas + flags + check-in text + phase + target language. Output (structured): `{ client_summary, coach_summary }`.
- **Model:** Claude Haiku 4.5 (default). One call per client per week.
- **Prompt caching:** shared system prompt (coaching persona + format rules) cached across the run's per-client calls.
- **Guardrails:**
  - **Quiet weeks** (little/no data): the prompt instructs the model to acknowledge the gaps and gently nudge — never invent numbers. Code also short-circuits to a simple "not much logged" template when `days_logged == 0`.
  - No medical claims; encouraging but honest tone for the client; concise/clinical for the coach.
  - Output written in the client's `language`.
- Built using the `claude-api` skill at implementation time (caching + current model id).

## 9. Architecture (isolation)

Core generation is pure/decoupled from the Vercel trigger:

- `lib/reports/week.ts` — week boundary helpers (Mon–Sun), building on existing `lib/date.ts`.
- `lib/reports/aggregate.ts` — `(clientId, weekStart) → metrics`. Pure data; unit-testable.
- `lib/reports/flags.ts` — `(metrics) → flags`. Pure; unit-testable.
- `lib/reports/ai.ts` — metrics → AI summaries.
- `lib/reports/generate.ts` — orchestrates aggregate → flags → ai → upsert `weekly_reports` row. Reused by cron, "Generate now", and "Regenerate".
- `app/api/cron/weekly-reports/route.ts` — thin trigger; iterates active clients; secured by `CRON_SECRET`. Swappable for Supabase pg_cron hitting the same endpoint.

## 10. Server actions (`actions/reports.ts`, all `requireCoach`)

- `generateNow(clientId?)` — generate/refresh draft(s) on demand (testing / off-cycle).
- `regenerateReport(id)` — re-pull data + re-run AI for an existing report (pre-release).
- `releaseReport(id, { clientSummary, coachNote })` — save coach edits, set `status='published'` + `published_at`, push the client.

## 11. UI / routes

**Client:**
- `app/app/reports/page.tsx` — list of published reports (newest first), empty state.
- `app/app/reports/[id]/page.tsx` — detail: headline, metric cards, charts (recharts — already installed), AI narrative, coach note.
- Add **Reports** entry to the client bottom nav / shell.

**Coach:**
- `app/coach/reports/page.tsx` — this week's **all-clients overview** (table: client, weight Δ, adherence %, training done, flag badges) + list of drafts to review + history.
- `app/coach/reports/[id]/page.tsx` — review screen: full metrics + charts, **editable** `client_summary`, `coach_note` field, **Release** + **Regenerate** buttons, plus the client's raw check-in.
- Link from `app/coach/clients/[id]/page.tsx`.

**i18n:** new message keys (next-intl, `messages/`) for all Reports UI chrome, hr + en.

## 12. Notifications (reuse existing push)

- Reuse the `send-push` Supabase Edge Function + existing subscription flow.
- **After Sunday generation:** push the **coach** — "N reports ready to review."
- **After release:** push the **client** — "Your weekly report is ready." (bilingual copy, like existing reminders).

## 13. Edge cases

- **No active clients / no data for a client:** skip or emit a minimal nudge report; never fabricate.
- **Re-runs / idempotency:** generation upserts on `(client_id, week_start)`. Regeneration is **draft-only** — it overwrites the AI fields of a draft. Once `published`, a report is immutable (no regeneration); the Sunday cron skips clients that already have a published report for that week.
- **Partial week / new client mid-week:** report only what exists; deltas omitted when prior week is empty.
- **AI/API failure:** the row is still created with metrics + flags; `client_summary`/`coach_summary` left empty with a retry path ("Regenerate"). A failed AI call for one client does not abort the others.

## 14. Security & privacy

- Cron endpoint authenticated via `CRON_SECRET` (Vercel cron header / Authorization).
- Clients can only read their own **published** reports (RLS).
- Generation uses service role only inside trusted server code.

## 15. New env / setup

- `ANTHROPIC_API_KEY` — **Igor to create** an Anthropic API key (free to create; pay-per-use, tiny here). Added to `.env.local` + Vercel.
- `CRON_SECRET` — generated; added to Vercel + the cron config.
- New dependency: `@anthropic-ai/sdk`.
- `vercel.json` — cron schedule for `app/api/cron/weekly-reports`.

## 16. Testing

- **Unit:** `aggregate.ts` and `flags.ts` against seeded daily_logs/workouts (pure functions, deterministic).
- **Manual/integration:** `generateNow` on the existing test client → verify draft → edit + release → view as client. Verify push copy in hr + en.
- **UI:** verify with the preview tools (charts render, narrative shows, draft hidden from client until released), including dark mode / mobile widths.

## 17. Out of scope (YAGNI — possible future)

- Email delivery / PDF export of reports.
- Configurable report templates or per-metric coach customization.
- Historical backfill beyond on-demand `generateNow`.
- Multi-coach scaling concerns (current app is single-coach).
