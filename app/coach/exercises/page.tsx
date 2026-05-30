import { getTranslations } from "next-intl/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ExerciseManager from "./exercise-manager";

export default async function ExerciseDatabasePage() {
  const t = await getTranslations("coach.exercises");
  const tErrors = await getTranslations("errors");
  const [{ data, error }, { data: usageRows }] = await Promise.all([
    supabaseAdmin
      .from("exercises")
      .select("id, name, muscle_group, equipment, difficulty, notes, video_url")
      .order("name", { ascending: true }),
    supabaseAdmin.from("program_exercises").select("exercise_id"),
  ]);

  if (error) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
        <p className="text-danger">{tErrors("genericLoad")}</p>
      </div>
    );
  }

  // Real "used in N programs" count per exercise.
  const usageMap: Record<string, number> = {};
  for (const row of usageRows ?? []) {
    const id = row.exercise_id as string;
    if (id) usageMap[id] = (usageMap[id] ?? 0) + 1;
  }

  return (
    <div>
      <ExerciseManager initialExercises={data ?? []} usageMap={usageMap} />
    </div>
  );
}
