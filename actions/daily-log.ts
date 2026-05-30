"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayCET } from "@/lib/date";

export type DailyLogData = {
  weight_kg: number | null;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  water_l: number | null;
  steps: number | null;
  cardio_min: number | null;
  sleep_h: number | null;
  sleep_quality: number | null;
  energy_level: number | null;
  notes: string | null;
  followed_meal_plan: boolean | null;
};

export async function saveDailyLog(data: DailyLogData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  const today = todayCET();

  const { error } = await supabase.from("daily_logs").upsert(
    {
      client_id: user.id,
      log_date: today,
      ...data,
    },
    { onConflict: "client_id,log_date" }
  );

  if (error) {
    console.error("Daily log save error:", error);
    return { error: "saveFailed" };
  }

  revalidatePath("/coach");
  revalidatePath(`/coach/clients/${user.id}`);
  revalidatePath("/app");

  return { success: true };
}

export async function getTodayLog() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  const today = todayCET();

  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("client_id", user.id)
    .eq("log_date", today)
    .maybeSingle();

  if (error) {
    console.error("Daily log fetch error:", error);
    return { error: "loadFailed" };
  }

  return { data };
}

export async function getClientTargets() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  const { data, error } = await supabase
    .from("clients")
    .select(
      "target_calories, target_protein_g, target_carbs_g, target_fat_g, target_steps, target_sleep_h"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Client targets fetch error:", error);
    return { error: "loadTargetsFailed" };
  }

  return { data };
}

export async function getProgressData() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  const { data, error } = await supabase
    .from("daily_logs")
    .select("log_date, weight_kg, calories_kcal, steps")
    .eq("client_id", user.id)
    .order("log_date", { ascending: true })
    .limit(30);

  if (error) {
    console.error("Progress data fetch error:", error);
    return { error: "loadProgressFailed" };
  }

  return { data };
}
