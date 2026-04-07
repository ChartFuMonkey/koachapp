"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireCoach } from "@/lib/auth/require-coach";

export async function getMeals() {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data, error } = await supabaseAdmin
    .from("meals")
    .select(`
      id, name, notes, created_at,
      meal_foods (
        id, quantity_g, sort_order,
        foods ( id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g )
      )
    `)
    .order("name", { ascending: true });

  if (error) {
    console.error("Meals fetch error:", error);
    return { error: "Greška pri dohvaćanju obroka." };
  }

  // Sort meal_foods by sort_order and normalize nested join
  const normalized = (data ?? []).map((meal: any) => ({
    ...meal,
    meal_foods: [...(meal.meal_foods ?? [])]
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((mf: any) => ({
        ...mf,
        foods: Array.isArray(mf.foods) ? mf.foods[0] : mf.foods,
      })),
  }));

  return { data: normalized };
}

export async function createMeal(name: string, notes: string | null) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  if (!name.trim()) return { error: "Naziv obroka je obavezan." };

  const { error } = await supabaseAdmin.from("meals").insert({
    name: name.trim(),
    notes: notes?.trim() || null,
    created_by: auth.user.id,
  });

  if (error) {
    console.error("Meal create error:", error);
    return { error: "Greška pri kreiranju obroka." };
  }

  return { success: true };
}

export async function updateMeal(id: string, name: string, notes: string | null) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  if (!name.trim()) return { error: "Naziv obroka je obavezan." };

  const { error } = await supabaseAdmin
    .from("meals")
    .update({
      name: name.trim(),
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("created_by", auth.user.id);

  if (error) {
    console.error("Meal update error:", error);
    return { error: "Greška pri ažuriranju obroka." };
  }

  return { success: true };
}

export async function deleteMeal(id: string) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { error } = await supabaseAdmin
    .from("meals")
    .delete()
    .eq("id", id)
    .eq("created_by", auth.user.id);

  if (error) {
    if (error.code === "23503") {
      return { error: "Obrok se koristi u planu prehrane — najprije ga uklonite iz plana." };
    }
    console.error("Meal delete error:", error);
    return { error: "Greška pri brisanju obroka." };
  }

  return { success: true };
}

export async function addMealFood(mealId: string, foodId: string, quantityG: number) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  // Get max sort_order
  const { data: existing } = await supabaseAdmin
    .from("meal_foods")
    .select("sort_order")
    .eq("meal_id", mealId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { error } = await supabaseAdmin.from("meal_foods").insert({
    meal_id: mealId,
    food_id: foodId,
    quantity_g: quantityG,
    sort_order: nextOrder,
  });

  if (error) {
    console.error("Add meal food error:", error);
    return { error: "Greška pri dodavanju namirnice u obrok." };
  }

  return { success: true };
}

export async function updateMealFood(id: string, quantityG: number) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { error } = await supabaseAdmin
    .from("meal_foods")
    .update({ quantity_g: quantityG })
    .eq("id", id);

  if (error) {
    console.error("Update meal food error:", error);
    return { error: "Greška pri ažuriranju količine." };
  }

  return { success: true };
}

export async function removeMealFood(id: string) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { error } = await supabaseAdmin
    .from("meal_foods")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Remove meal food error:", error);
    return { error: "Greška pri uklanjanju namirnice iz obroka." };
  }

  return { success: true };
}

export async function reorderMealFood(
  id: string,
  mealId: string,
  direction: "up" | "down"
) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data: items } = await supabaseAdmin
    .from("meal_foods")
    .select("id, sort_order")
    .eq("meal_id", mealId)
    .order("sort_order", { ascending: true });

  if (!items) return { error: "Greška." };

  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return { error: "Greška." };

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= items.length) return { success: true };

  const a = items[idx];
  const b = items[swapIdx];

  await Promise.all([
    supabaseAdmin
      .from("meal_foods")
      .update({ sort_order: b.sort_order })
      .eq("id", a.id),
    supabaseAdmin
      .from("meal_foods")
      .update({ sort_order: a.sort_order })
      .eq("id", b.id),
  ]);

  return { success: true };
}
