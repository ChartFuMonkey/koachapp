"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireCoach } from "@/lib/auth/require-coach";

export async function getExercises() {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data, error } = await supabaseAdmin
    .from("exercises")
    .select("id, name, muscle_group, equipment, difficulty, notes, video_url, video_storage_path")
    .order("name", { ascending: true });

  if (error) {
    console.error("Exercises fetch error:", error);
    return { error: "loadFailed" as const };
  }

  return { data: data ?? [] };
}

export async function createExercise(formData: FormData) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "nameRequired" as const };

  const { error } = await supabaseAdmin.from("exercises").insert({
    name,
    muscle_group: (formData.get("muscle_group") as string) || null,
    equipment: (formData.get("equipment") as string) || null,
    difficulty: (formData.get("difficulty") as string) || null,
    notes: (formData.get("notes") as string) || null,
    video_url: (formData.get("video_url") as string) || null,
    created_by: auth.user.id,
  });

  if (error) {
    if (error.code === "23505") return { error: "duplicateName" as const };
    console.error("Exercise create error:", error);
    return { error: "createFailed" as const };
  }

  return { success: true };
}

export async function updateExercise(id: string, formData: FormData) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "nameRequired" as const };

  const { error } = await supabaseAdmin
    .from("exercises")
    .update({
      name,
      muscle_group: (formData.get("muscle_group") as string) || null,
      equipment: (formData.get("equipment") as string) || null,
      difficulty: (formData.get("difficulty") as string) || null,
      notes: (formData.get("notes") as string) || null,
      video_url: (formData.get("video_url") as string) || null,
    })
    .eq("id", id)
    .eq("created_by", auth.user.id);

  if (error) {
    if (error.code === "23505") return { error: "duplicateName" as const };
    console.error("Exercise update error:", error);
    return { error: "updateFailed" as const };
  }

  return { success: true };
}

export async function deleteExercise(id: string) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { error } = await supabaseAdmin
    .from("exercises")
    .delete()
    .eq("id", id)
    .eq("created_by", auth.user.id);

  if (error) {
    if (error.code === "23503") {
      return { error: "exerciseInUse" as const };
    }
    console.error("Exercise delete error:", error);
    return { error: "deleteFailed" as const };
  }

  return { success: true };
}
