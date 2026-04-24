import { getTranslations } from "next-intl/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ExerciseManager from "./exercise-manager";

export default async function ExerciseDatabasePage() {
  const t = await getTranslations("coach.exercises");
  const tErrors = await getTranslations("errors");
  const { data, error } = await supabaseAdmin
    .from("exercises")
    .select("id, name, muscle_group, equipment, difficulty, notes, video_url")
    .order("name", { ascending: true });

  if (error) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
        <p className="text-red-400">{tErrors("genericLoad")}</p>
      </div>
    );
  }

  return (
    <div>
      <ExerciseManager initialExercises={data ?? []} />
    </div>
  );
}
