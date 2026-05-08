"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayCET } from "@/lib/date";

export type CheckinData = {
  energy_level: number;
  stress_level: number;
  motivation: number;
  sleep_quality: number;
  appetite: number;
  adherence_diet_pct: number | null;
  adherence_training: boolean;
  what_went_well: string | null;
  challenges: string | null;
  goals_next_week: string | null;
  questions_for_coach: string | null;
  overall_rating: number;
};

export async function getThisWeekCheckin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "unauthenticated" };

  // Calculate last Monday (ISO week starts Monday) using CET date
  const todayStr = todayCET();
  const now = new Date(todayStr + "T12:00:00");
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const mondayStr = monday.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("client_id", user.id)
    .gte("checkin_date", mondayStr)
    .lte("checkin_date", todayStr)
    .maybeSingle();

  if (error) {
    console.error("Checkin fetch error:", error);
    return { error: "loadFailed" };
  }

  return { data };
}

export async function submitCheckin(formData: CheckinData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "unauthenticated" };

  const today = todayCET();

  // Calculate ISO week number
  const d = new Date(today + "T00:00:00");
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNumber =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );

  const { error } = await supabase.from("checkins").insert({
    client_id: user.id,
    checkin_date: today,
    week_number: weekNumber,
    ...formData,
  });

  if (error) {
    console.error("Checkin submit error:", error);
    return { error: "submitFailed" };
  }

  revalidatePath("/coach");
  revalidatePath(`/coach/clients/${user.id}`);

  return { success: true };
}
