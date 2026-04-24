"use server";

import { createClient } from "@/lib/supabase/server";

export async function getProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, date_of_birth, gender, height_cm")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Profile fetch error:", error);
    return { error: "loadFailed" };
  }

  return { data: { ...data, email: user.email } };
}

export async function updateProfile(formData: {
  full_name: string;
  height_cm: number | null;
  date_of_birth: string | null;
  gender: string | null;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: formData.full_name,
      height_cm: formData.height_cm,
      date_of_birth: formData.date_of_birth,
      gender: formData.gender,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Profile update error:", error);
    return { error: "updateFailed" };
  }

  return { success: true };
}

export async function getProfileDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  const [{ data: client }, { data: phase }] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "start_date, start_weight_kg, target_calories, target_protein_g, target_carbs_g, target_fat_g, target_steps, target_sleep_h"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("phases")
      .select("name, type, start_date")
      .eq("client_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  return {
    data: {
      targets: client
        ? {
            calories: client.target_calories,
            protein: client.target_protein_g,
            carbs: client.target_carbs_g,
            fat: client.target_fat_g,
            steps: client.target_steps,
            sleep: client.target_sleep_h,
          }
        : null,
      phase: phase
        ? { name: phase.name, type: phase.type, start_date: phase.start_date }
        : null,
      start_date: client?.start_date || null,
      start_weight: client?.start_weight_kg || null,
    },
  };
}
