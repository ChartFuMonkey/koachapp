import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Verifies the current session user is the coach.
 * Call at the top of every coach-only server action.
 */
export async function requireCoach() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "unauthenticated" as const };
  }

  const coachId = process.env.NEXT_PUBLIC_COACH_UUID!;
  if (user.id !== coachId) {
    return { error: "unauthenticated" as const };
  }

  return { user };
}

/**
 * Verifies the current session user is the coach AND owns the given client.
 */
export async function requireCoachOwnsClient(clientId: string) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("coach_id", auth.user.id)
    .maybeSingle();

  if (!data) {
    return { error: "unauthenticated" as const };
  }

  return { user: auth.user };
}

/**
 * Verifies the coach owns the program (via program -> client -> coach).
 */
export async function requireCoachOwnsProgram(programId: string) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data } = await supabaseAdmin
    .from("workout_programs")
    .select("id, clients!inner(coach_id)")
    .eq("id", programId)
    .eq("clients.coach_id", auth.user.id)
    .maybeSingle();

  if (!data) {
    return { error: "unauthenticated" as const };
  }

  return { user: auth.user };
}

/**
 * Verifies the coach owns the program day (via day -> program -> client -> coach).
 */
export async function requireCoachOwnsProgramDay(dayId: string) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data } = await supabaseAdmin
    .from("program_days")
    .select("id, workout_programs!inner(clients!inner(coach_id))")
    .eq("id", dayId)
    .eq("workout_programs.clients.coach_id", auth.user.id)
    .maybeSingle();

  if (!data) {
    return { error: "unauthenticated" as const };
  }

  return { user: auth.user };
}

/**
 * Verifies the coach owns the program exercise (via exercise -> day -> program -> client -> coach).
 */
export async function requireCoachOwnsProgramExercise(exerciseId: string) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data } = await supabaseAdmin
    .from("program_exercises")
    .select("id, program_days!inner(workout_programs!inner(clients!inner(coach_id)))")
    .eq("id", exerciseId)
    .eq("program_days.workout_programs.clients.coach_id", auth.user.id)
    .maybeSingle();

  if (!data) {
    return { error: "unauthenticated" as const };
  }

  return { user: auth.user };
}

/**
 * Verifies the coach owns the meal plan (via meal_plan -> client -> coach).
 */
export async function requireCoachOwnsMealPlan(planId: string) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data } = await supabaseAdmin
    .from("meal_plans")
    .select("id, clients!inner(coach_id)")
    .eq("id", planId)
    .eq("clients.coach_id", auth.user.id)
    .maybeSingle();

  if (!data) {
    return { error: "unauthenticated" as const };
  }

  return { user: auth.user };
}

/**
 * Verifies the coach owns the phase (via phase -> client -> coach).
 */
export async function requireCoachOwnsPhase(phaseId: string) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data } = await supabaseAdmin
    .from("phases")
    .select("id, clients!inner(coach_id)")
    .eq("id", phaseId)
    .eq("clients.coach_id", auth.user.id)
    .maybeSingle();

  if (!data) {
    return { error: "unauthenticated" as const };
  }

  return { user: auth.user };
}
