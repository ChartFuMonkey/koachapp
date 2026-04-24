import { getTranslations } from "next-intl/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import FoodManager from "./food-manager";

export default async function FoodDatabasePage() {
  const t = await getTranslations("coach.foods");
  const tErrors = await getTranslations("errors");
  const { data, error } = await supabaseAdmin
    .from("foods")
    .select("id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, is_preset")
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
      <FoodManager initialFoods={data ?? []} />
    </div>
  );
}
