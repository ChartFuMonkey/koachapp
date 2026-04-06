"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getExercises() {
  const { data, error } = await supabaseAdmin
    .from("exercises")
    .select("id, name, muscle_group, equipment, difficulty, notes, video_url")
    .order("name", { ascending: true });

  if (error) {
    console.error("Exercises fetch error:", error);
    return { error: "Greška pri dohvaćanju vježbi." };
  }

  return { data: data ?? [] };
}

export async function createExercise(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Naziv vježbe je obavezan." };

  const coachId = process.env.NEXT_PUBLIC_COACH_UUID!;

  const { error } = await supabaseAdmin.from("exercises").insert({
    name,
    muscle_group: (formData.get("muscle_group") as string) || null,
    equipment: (formData.get("equipment") as string) || null,
    difficulty: (formData.get("difficulty") as string) || null,
    notes: (formData.get("notes") as string) || null,
    video_url: (formData.get("video_url") as string) || null,
    created_by: coachId,
  });

  if (error) {
    if (error.code === "23505") return { error: "Vježba s tim nazivom već postoji." };
    console.error("Exercise create error:", error);
    return { error: "Greška pri kreiranju vježbe." };
  }

  return { success: true };
}

export async function updateExercise(id: string, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Naziv vježbe je obavezan." };

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
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Vježba s tim nazivom već postoji." };
    console.error("Exercise update error:", error);
    return { error: "Greška pri ažuriranju vježbe." };
  }

  return { success: true };
}

export async function deleteExercise(id: string) {
  const { error } = await supabaseAdmin
    .from("exercises")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return { error: "Vježba se koristi u programu — najprije ju uklonite iz programa." };
    }
    console.error("Exercise delete error:", error);
    return { error: "Greška pri brisanju vježbe." };
  }

  return { success: true };
}
