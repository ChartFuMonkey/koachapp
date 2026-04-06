"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

// ── Programs ──────────────────────────────────────────────

export async function getClientPrograms(clientId: string) {
  const { data, error } = await supabaseAdmin
    .from("workout_programs")
    .select(
      `
      id, name, is_active, created_at,
      program_days (
        id, day_label, sort_order,
        program_exercises (
          id, sets, reps, rest_sec, rpe, sort_order,
          exercises ( id, name )
        )
      )
    `
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Programs fetch error:", error);
    return { error: "Greška pri dohvaćanju programa." };
  }

  // Sort days and exercises within each program
  const sorted = (data ?? []).map((prog) => ({
    ...prog,
    program_days: [...(prog.program_days ?? [])]
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((day: any) => ({
        ...day,
        program_exercises: [...(day.program_exercises ?? [])]
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((pe: any) => ({
            ...pe,
            exercises: Array.isArray(pe.exercises) ? pe.exercises[0] : pe.exercises,
          })),
      })),
  }));

  return { data: sorted };
}

export async function createProgram(clientId: string, name: string) {
  const coachId = process.env.NEXT_PUBLIC_COACH_UUID!;

  const { data, error } = await supabaseAdmin
    .from("workout_programs")
    .insert({
      client_id: clientId,
      name,
      is_active: false,
      created_by: coachId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Program create error:", error);
    return { error: "Greška pri kreiranju programa." };
  }

  return { data };
}

export async function deleteProgram(programId: string) {
  // Delete program_exercises, then days, then program
  const { data: days } = await supabaseAdmin
    .from("program_days")
    .select("id")
    .eq("program_id", programId);

  if (days && days.length > 0) {
    const dayIds = days.map((d) => d.id);
    await supabaseAdmin
      .from("program_exercises")
      .delete()
      .in("day_id", dayIds);

    await supabaseAdmin
      .from("program_days")
      .delete()
      .eq("program_id", programId);
  }

  const { error } = await supabaseAdmin
    .from("workout_programs")
    .delete()
    .eq("id", programId);

  if (error) {
    console.error("Program delete error:", error);
    return { error: "Greška pri brisanju programa." };
  }

  return { success: true };
}

export async function activateProgram(clientId: string, programId: string) {
  // Deactivate all programs for this client
  const { error: deactivateErr } = await supabaseAdmin
    .from("workout_programs")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("client_id", clientId);

  if (deactivateErr) {
    console.error("Deactivate error:", deactivateErr);
    return { error: "Greška pri deaktivaciji programa." };
  }

  // Activate the selected one
  const { error } = await supabaseAdmin
    .from("workout_programs")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", programId);

  if (error) {
    console.error("Activate error:", error);
    return { error: "Greška pri aktivaciji programa." };
  }

  return { success: true };
}

// ── Days ──────────────────────────────────────────────────

export async function addProgramDay(programId: string, dayLabel: string) {
  // Get current max sort_order
  const { data: existing } = await supabaseAdmin
    .from("program_days")
    .select("sort_order")
    .eq("program_id", programId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0;

  const { data, error } = await supabaseAdmin
    .from("program_days")
    .insert({
      program_id: programId,
      day_label: dayLabel,
      sort_order: nextOrder,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Day create error:", error);
    return { error: "Greška pri dodavanju dana." };
  }

  return { data };
}

export async function deleteProgramDay(dayId: string) {
  await supabaseAdmin
    .from("program_exercises")
    .delete()
    .eq("day_id", dayId);

  const { error } = await supabaseAdmin
    .from("program_days")
    .delete()
    .eq("id", dayId);

  if (error) {
    console.error("Day delete error:", error);
    return { error: "Greška pri brisanju dana." };
  }

  return { success: true };
}

// ── Program Exercises ─────────────────────────────────────

export async function addProgramExercise(
  dayId: string,
  exerciseId: string,
  sets: number | null,
  reps: string | null,
  restSec: number | null,
  rpe: number | null
) {
  // Get current max sort_order for this day
  const { data: existing } = await supabaseAdmin
    .from("program_exercises")
    .select("sort_order")
    .eq("day_id", dayId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0;

  const { error } = await supabaseAdmin.from("program_exercises").insert({
    day_id: dayId,
    exercise_id: exerciseId,
    sets,
    reps,
    rest_sec: restSec,
    rpe,
    sort_order: nextOrder,
  });

  if (error) {
    console.error("Program exercise add error:", error);
    return { error: "Greška pri dodavanju vježbe." };
  }

  return { success: true };
}

export async function removeProgramExercise(id: string) {
  const { error } = await supabaseAdmin
    .from("program_exercises")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Program exercise remove error:", error);
    return { error: "Greška pri uklanjanju vježbe." };
  }

  return { success: true };
}

export async function reorderProgramExercise(
  id: string,
  dayId: string,
  direction: "up" | "down"
) {
  // Get all exercises for this day, ordered
  const { data: exercises, error } = await supabaseAdmin
    .from("program_exercises")
    .select("id, sort_order")
    .eq("day_id", dayId)
    .order("sort_order", { ascending: true });

  if (error || !exercises) {
    return { error: "Greška pri dohvaćanju vježbi." };
  }

  const idx = exercises.findIndex((e) => e.id === id);
  if (idx === -1) return { error: "Vježba nije pronađena." };

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= exercises.length) return { success: true }; // Already at boundary

  // Swap sort_orders
  const currentOrder = exercises[idx].sort_order ?? idx;
  const swapOrder = exercises[swapIdx].sort_order ?? swapIdx;

  await Promise.all([
    supabaseAdmin
      .from("program_exercises")
      .update({ sort_order: swapOrder })
      .eq("id", exercises[idx].id),
    supabaseAdmin
      .from("program_exercises")
      .update({ sort_order: currentOrder })
      .eq("id", exercises[swapIdx].id),
  ]);

  return { success: true };
}
