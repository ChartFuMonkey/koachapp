import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import MealPlanBuilder from "./meal-plan-builder";

export default async function MealPlanBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [clientRes, profileRes, plansRes, mealsRes] = await Promise.all([
    supabaseAdmin.from("clients").select("id").eq("id", id).maybeSingle(),
    supabaseAdmin.from("profiles").select("full_name").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("meal_plans")
      .select(`
        id, name, is_active, created_at,
        meal_plan_entries (
          id, day_of_week, slot_number,
          meals ( id, name )
        )
      `)
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("meals")
      .select(`
        id, name,
        meal_foods (
          id, quantity_g,
          foods ( calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g )
        )
      `)
      .order("name", { ascending: true }),
  ]);

  if (!clientRes.data) notFound();

  // Normalize nested joins
  const plans = (plansRes.data ?? []).map((plan: any) => ({
    ...plan,
    meal_plan_entries: (plan.meal_plan_entries ?? []).map((entry: any) => ({
      ...entry,
      meals: Array.isArray(entry.meals) ? entry.meals[0] : entry.meals,
    })),
  }));

  // Compute meal macros for display in picker
  const meals = (mealsRes.data ?? []).map((meal: any) => {
    let cal = 0, protein = 0, carbs = 0, fat = 0;
    for (const mf of meal.meal_foods ?? []) {
      const f = Array.isArray(mf.foods) ? mf.foods[0] : mf.foods;
      if (!f) continue;
      const factor = mf.quantity_g / 100;
      cal += f.calories_per_100g * factor;
      protein += f.protein_per_100g * factor;
      carbs += f.carbs_per_100g * factor;
      fat += f.fat_per_100g * factor;
    }
    return {
      id: meal.id,
      name: meal.name,
      cal: Math.round(cal),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
    };
  });

  return (
    <MealPlanBuilder
      clientId={id}
      clientName={profileRes.data?.full_name ?? "Klijent"}
      plans={plans}
      allMeals={meals}
    />
  );
}
