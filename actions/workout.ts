"use server";

import { createClient } from "@/lib/supabase/server";
import { todayCET } from "@/lib/date";

export async function getActiveProgram() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "unauthenticated" };

  // Get active program
  const { data: program, error: progErr } = await supabase
    .from("workout_programs")
    .select("id, name")
    .eq("client_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (progErr) {
    console.error("Program fetch error:", progErr);
    return { error: "loadProgramFailed" };
  }

  if (!program) return { data: null };

  // Get program days with exercises
  const { data: days, error: daysErr } = await supabase
    .from("program_days")
    .select(
      `
      id, day_label, sort_order,
      program_exercises (
        id, sets, reps, rest_sec, rpe, sort_order,
        exercises ( id, name, notes, video_url )
      )
    `
    )
    .eq("program_id", program.id)
    .order("sort_order", { ascending: true });

  if (daysErr) {
    console.error("Days fetch error:", daysErr);
    return { error: "loadDaysFailed" };
  }

  // Sort exercises within each day, normalize nested joins
  const sortedDays = (days ?? []).map((day) => ({
    ...day,
    program_exercises: [...(day.program_exercises ?? [])]
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((pe: any) => ({
        ...pe,
        exercises: Array.isArray(pe.exercises) ? pe.exercises[0] : pe.exercises,
      })),
  }));

  return { data: { ...program, days: sortedDays } };
}

export async function createWorkoutSession(programDayId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "unauthenticated" };

  const today = todayCET();

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      client_id: user.id,
      program_day_id: programDayId,
      session_date: today,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Session create error:", error);
    return { error: "createSessionFailed" };
  }

  return { data };
}

export async function logExerciseSet(params: {
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe: number | null;
  notes: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "unauthenticated" };

  const { error } = await supabase.from("exercise_logs").insert({
    session_id: params.session_id,
    exercise_id: params.exercise_id,
    set_number: params.set_number,
    reps: params.reps,
    weight_kg: params.weight_kg,
    rpe: params.rpe,
    notes: params.notes,
  });

  if (error) {
    console.error("Exercise log error:", error);
    return { error: "saveSetFailed" };
  }

  return { success: true };
}

export async function finishWorkoutSession(
  sessionId: string,
  durationMin: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "unauthenticated" };

  const { error } = await supabase
    .from("workout_sessions")
    .update({ duration_min: durationMin })
    .eq("id", sessionId)
    .eq("client_id", user.id);

  if (error) {
    console.error("Session finish error:", error);
    return { error: "finishSessionFailed" };
  }

  return { success: true };
}

export async function getPreviousWeights(exerciseIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "unauthenticated" };

  // For each exercise, get the most recent log from a previous session
  const { data, error } = await supabase
    .from("exercise_logs")
    .select(
      `
      exercise_id, weight_kg, reps, set_number,
      workout_sessions!inner ( client_id )
    `
    )
    .in("exercise_id", exerciseIds)
    .eq("workout_sessions.client_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Previous weights error:", error);
    return { error: "loadPrevWeightsFailed" };
  }

  // Group by exercise_id, take the first (most recent) set 1 entry
  const weights: Record<string, number> = {};
  for (const log of data ?? []) {
    if (!weights[log.exercise_id] && log.set_number === 1) {
      weights[log.exercise_id] = log.weight_kg;
    }
  }

  return { data: weights };
}

export async function getDayExercises(dayId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "unauthenticated" };

  const { data, error } = await supabase
    .from("program_exercises")
    .select(
      `
      id, sets, reps, rest_sec, rpe, sort_order,
      exercises ( id, name, notes, video_url )
    `
    )
    .eq("day_id", dayId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Day exercises fetch error:", error);
    return { error: "loadExercisesFailed" };
  }

  // Normalize nested join (exercises may come as array)
  const normalized = (data ?? []).map((pe: any) => ({
    ...pe,
    exercises: Array.isArray(pe.exercises) ? pe.exercises[0] : pe.exercises,
  }));

  return { data: normalized };
}
