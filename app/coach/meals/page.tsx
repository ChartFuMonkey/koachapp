import { getTranslations } from "next-intl/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import MealManager from "./meal-manager";

export default async function MealDatabasePage() {
  const t = await getTranslations("coach.meals");
  const tErrors = await getTranslations("errors");
  const [mealsResult, foodsResult] = await Promise.all([
    supabaseAdmin
      .from("meals")
      .select(`
        id, name, notes, created_at,
        meal_foods (
          id, quantity_g, sort_order,
          foods ( id, name, name_en, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g )
        )
      `)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("foods")
      .select("id, name, name_en, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category")
      .order("name", { ascending: true }),
  ]);

  if (mealsResult.error || foodsResult.error) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
        <p className="text-danger">{tErrors("genericLoad")}</p>
      </div>
    );
  }

  // Normalize nested joins and sort meal_foods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meals = (mealsResult.data ?? []).map((meal: any) => ({
    ...meal,
    meal_foods: [...(meal.meal_foods ?? [])]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((mf: any) => ({
        ...mf,
        foods: Array.isArray(mf.foods) ? mf.foods[0] : mf.foods,
      })),
  }));

  return (
    <div>
      <MealManager initialMeals={meals} allFoods={foodsResult.data ?? []} />
    </div>
  );
}
