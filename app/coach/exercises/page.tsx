import { supabaseAdmin } from "@/lib/supabase/admin";
import ExerciseManager from "./exercise-manager";

export default async function ExerciseDatabasePage() {
  const { data, error } = await supabaseAdmin
    .from("exercises")
    .select("id, name, muscle_group, equipment, difficulty, notes, video_url")
    .order("name", { ascending: true });

  if (error) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Exercise Database</h1>
        <p className="text-red-400">Error loading exercises.</p>
      </div>
    );
  }

  return (
    <div>
      <ExerciseManager initialExercises={data ?? []} />
    </div>
  );
}
