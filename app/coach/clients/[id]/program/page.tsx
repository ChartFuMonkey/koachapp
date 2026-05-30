import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import ProgramBuilder from "./program-builder";

export default async function ProgramBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [clientRes, profileRes, programsRes, exercisesRes, t] = await Promise.all([
    supabaseAdmin.from("clients").select("id").eq("id", id).maybeSingle(),
    supabaseAdmin.from("profiles").select("full_name").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("workout_programs")
      .select(
        `
        id, name, is_active, created_at, goal, total_weeks, coach_note,
        program_days (
          id, day_label, sort_order,
          program_exercises (
            id, sets, reps, rest_sec, rpe, sort_order,
            exercises ( id, name, muscle_group )
          )
        )
      `
      )
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("exercises")
      .select("id, name, muscle_group")
      .order("name", { ascending: true }),
    getTranslations("coach.clients.detail"),
  ]);

  if (!clientRes.data) notFound();

  // Sort days and exercises within each program
  const programs = (programsRes.data ?? []).map((prog: any) => ({
    ...prog,
    program_days: [...(prog.program_days ?? [])]
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((day: any) => ({
        ...day,
        program_exercises: [...(day.program_exercises ?? [])]
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((pe: any) => ({
            ...pe,
            exercises: Array.isArray(pe.exercises)
              ? pe.exercises[0]
              : pe.exercises,
          })),
      })),
  }));

  return (
    <ProgramBuilder
      clientId={id}
      clientName={profileRes.data?.full_name ?? t("unknownClient")}
      programs={programs}
      allExercises={exercisesRes.data ?? []}
    />
  );
}
