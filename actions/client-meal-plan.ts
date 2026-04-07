"use server";

import { createClient } from "@/lib/supabase/server";
import { todayCET } from "@/lib/date";

type FoodInfo = {
  name: string;
  quantity_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealSlot = {
  slot_number: number;
  meal_name: string;
  foods: FoodInfo[];
  totals: { cal: number; protein: number; carbs: number; fat: number };
};

export type TodayMealsResult = {
  meals: MealSlot[];
  dailyTotals: { cal: number; protein: number; carbs: number; fat: number };
  planName: string | null;
};

export async function getTodayMeals(): Promise<{
  data?: TodayMealsResult;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nisi prijavljen/a." };

  // 1. Get active meal plan
  const { data: plan } = await supabase
    .from("meal_plans")
    .select("id, name")
    .eq("client_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!plan) {
    return { data: { meals: [], dailyTotals: { cal: 0, protein: 0, carbs: 0, fat: 0 }, planName: null } };
  }

  // 2. Determine today's day_of_week (1=Mon...7=Sun)
  const today = todayCET();
  const todayDate = new Date(today + "T12:00:00");
  const jsDay = todayDate.getDay(); // 0=Sun, 1=Mon...6=Sat
  const dayOfWeek = jsDay === 0 ? 7 : jsDay; // Convert to 1=Mon...7=Sun

  // 3. Check overrides for today
  const { data: overrides } = await supabase
    .from("meal_plan_overrides")
    .select("slot_number, meal_id")
    .eq("client_id", user.id)
    .eq("override_date", today);

  // 4. Get template entries for today's day_of_week
  const { data: templateEntries } = await supabase
    .from("meal_plan_entries")
    .select("slot_number, meal_id")
    .eq("meal_plan_id", plan.id)
    .eq("day_of_week", dayOfWeek);

  // 5. Merge: overrides take priority per slot
  const overrideMap = new Map<number, string>();
  for (const o of overrides ?? []) {
    overrideMap.set(o.slot_number, o.meal_id);
  }

  const slotMealIds = new Map<number, string>();
  for (const entry of templateEntries ?? []) {
    slotMealIds.set(entry.slot_number, entry.meal_id);
  }
  // Overrides replace template entries
  for (const [slot, mealId] of overrideMap) {
    slotMealIds.set(slot, mealId);
  }

  if (slotMealIds.size === 0) {
    return { data: { meals: [], dailyTotals: { cal: 0, protein: 0, carbs: 0, fat: 0 }, planName: plan.name } };
  }

  // 6. Fetch all unique meals with their foods
  const uniqueMealIds = [...new Set(slotMealIds.values())];
  const { data: mealsData } = await supabase
    .from("meals")
    .select(`
      id, name,
      meal_foods (
        quantity_g, sort_order,
        foods ( name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g )
      )
    `)
    .in("id", uniqueMealIds);

  // Build meal lookup
  const mealLookup = new Map<string, any>();
  for (const meal of mealsData ?? []) {
    mealLookup.set(meal.id, meal);
  }

  // 7. Build result
  const slots: MealSlot[] = [];
  let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

  const sortedSlots = [...slotMealIds.entries()].sort((a, b) => a[0] - b[0]);

  for (const [slotNumber, mealId] of sortedSlots) {
    const meal = mealLookup.get(mealId);
    if (!meal) continue;

    const foods: FoodInfo[] = [];
    let mealCal = 0, mealProtein = 0, mealCarbs = 0, mealFat = 0;

    const sortedFoods = [...(meal.meal_foods ?? [])].sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );

    for (const mf of sortedFoods) {
      const f = Array.isArray(mf.foods) ? mf.foods[0] : mf.foods;
      if (!f) continue;

      const factor = mf.quantity_g / 100;
      const cal = Math.round(f.calories_per_100g * factor);
      const protein = Math.round(f.protein_per_100g * factor * 10) / 10;
      const carbs = Math.round(f.carbs_per_100g * factor * 10) / 10;
      const fat = Math.round(f.fat_per_100g * factor * 10) / 10;

      foods.push({
        name: f.name,
        quantity_g: mf.quantity_g,
        calories: cal,
        protein,
        carbs,
        fat,
      });

      mealCal += cal;
      mealProtein += protein;
      mealCarbs += carbs;
      mealFat += fat;
    }

    slots.push({
      slot_number: slotNumber,
      meal_name: meal.name,
      foods,
      totals: {
        cal: Math.round(mealCal),
        protein: Math.round(mealProtein),
        carbs: Math.round(mealCarbs),
        fat: Math.round(mealFat),
      },
    });

    totalCal += mealCal;
    totalProtein += mealProtein;
    totalCarbs += mealCarbs;
    totalFat += mealFat;
  }

  return {
    data: {
      meals: slots,
      dailyTotals: {
        cal: Math.round(totalCal),
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fat: Math.round(totalFat),
      },
      planName: plan.name,
    },
  };
}
