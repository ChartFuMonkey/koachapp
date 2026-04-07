"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireCoach } from "@/lib/auth/require-coach";

export async function getFoods() {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data, error } = await supabaseAdmin
    .from("foods")
    .select("id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, is_preset")
    .order("name", { ascending: true });

  if (error) {
    console.error("Foods fetch error:", error);
    return { error: "Greška pri dohvaćanju namirnica." };
  }

  return { data: data ?? [] };
}

export async function createFood(formData: FormData) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Naziv namirnice je obavezan." };

  const { error } = await supabaseAdmin.from("foods").insert({
    name,
    calories_per_100g: Number(formData.get("calories_per_100g")) || 0,
    protein_per_100g: Number(formData.get("protein_per_100g")) || 0,
    carbs_per_100g: Number(formData.get("carbs_per_100g")) || 0,
    fat_per_100g: Number(formData.get("fat_per_100g")) || 0,
    category: (formData.get("category") as string) || null,
    is_preset: false,
    created_by: auth.user.id,
  });

  if (error) {
    console.error("Food create error:", error);
    return { error: "Greška pri kreiranju namirnice." };
  }

  return { success: true };
}

export async function updateFood(id: string, formData: FormData) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Naziv namirnice je obavezan." };

  const { error } = await supabaseAdmin
    .from("foods")
    .update({
      name,
      calories_per_100g: Number(formData.get("calories_per_100g")) || 0,
      protein_per_100g: Number(formData.get("protein_per_100g")) || 0,
      carbs_per_100g: Number(formData.get("carbs_per_100g")) || 0,
      fat_per_100g: Number(formData.get("fat_per_100g")) || 0,
      category: (formData.get("category") as string) || null,
    })
    .eq("id", id)
    .eq("created_by", auth.user.id);

  if (error) {
    console.error("Food update error:", error);
    return { error: "Greška pri ažuriranju namirnice." };
  }

  return { success: true };
}

export async function deleteFood(id: string) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { error } = await supabaseAdmin
    .from("foods")
    .delete()
    .eq("id", id)
    .eq("created_by", auth.user.id);

  if (error) {
    if (error.code === "23503") {
      return { error: "Namirnica se koristi u obroku — najprije ju uklonite iz obroka." };
    }
    console.error("Food delete error:", error);
    return { error: "Greška pri brisanju namirnice." };
  }

  return { success: true };
}
