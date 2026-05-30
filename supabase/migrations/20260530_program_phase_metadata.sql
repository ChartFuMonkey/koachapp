-- Phase 1 optimization: replace hardcoded placeholders with real, persisted data.
-- All columns are nullable and additive — no impact on existing rows.

-- Program metadata surfaced in the program-builder header (was "WEEK 1/8",
-- "HYPERTROPHY", and a hardcoded coach note).
alter table public.workout_programs
  add column if not exists goal text,
  add column if not exists total_weeks integer,
  add column if not exists coach_note text;

-- Per-phase prescription targets surfaced in the phase "Active phase" panel
-- (were hardcoded: protein 180g, steps 10,000, cardio, lift volume, weigh-ins).
alter table public.phases
  add column if not exists target_protein_g integer,
  add column if not exists target_steps integer,
  add column if not exists cardio_note text,
  add column if not exists lift_volume_note text,
  add column if not exists weighin_freq text;

-- Optional per-entry meal time (was positional "AM/13:00/16:00/20:00" labels).
alter table public.meal_plan_entries
  add column if not exists time text;
