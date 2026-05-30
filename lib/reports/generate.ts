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
import { computeTrends } from "./trends";
import { generateSummaries, REPORT_MODEL } from "./ai";
import type {
  WeeklyReportRow,
  ReportLanguage,
  CheckinEcho,
  PhaseInfo,
} from "./types";

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
      const logs =
        (ps as { exercise_logs: { exercise_id: string; weight_kg: number | null }[] })
          .exercise_logs ?? [];
      for (const e of logs) {
        if (e.weight_kg == null) continue;
        priorBests[e.exercise_id] = Math.max(
          priorBests[e.exercise_id] ?? 0,
          e.weight_kg
        );
      }
    }
    const { data: exRows } = await supabaseAdmin
      .from("exercises")
      .select("id, name")
      .in("id", exerciseIds);
    for (const ex of exRows ?? [])
      exerciseNames[ex.id as string] = ex.name as string;
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
    ? {
        name: phaseRow.name,
        type: phaseRow.type,
        targetKcal: phaseRow.target_kcal,
      }
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

  const trendExerciseIds = [...new Set(strengthHistory.map((s) => s.exercise_id))];
  const trendExerciseNames: Record<string, string> = { ...exerciseNames };
  const missingNames = trendExerciseIds.filter((eid) => !(eid in trendExerciseNames));
  if (missingNames.length > 0) {
    const { data: exRows2 } = await supabaseAdmin
      .from("exercises").select("id, name").in("id", missingNames);
    for (const ex of exRows2 ?? []) trendExerciseNames[ex.id as string] = ex.name as string;
  }

  metrics.trends = computeTrends({
    weekStart,
    dailyHistory: (weightHistory ?? []) as { log_date: string; weight_kg: number | null }[],
    measHistory: (measHistoryRows ?? []) as { meas_date: string; waist_cm: number | null; body_fat_pct: number | null }[],
    strengthHistory,
    exerciseNames: trendExerciseNames,
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
