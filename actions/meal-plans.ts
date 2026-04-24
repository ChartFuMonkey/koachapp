"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  requireCoachOwnsClient,
  requireCoachOwnsMealPlan,
} from "@/lib/auth/require-coach";

export async function getClientMealPlans(clientId: string) {
  const auth = await requireCoachOwnsClient(clientId);
  if (auth.error) return { error: auth.error };

  const { data, error } = await supabaseAdmin
    .from("meal_plans")
    .select(`
      id, name, is_active, created_at,
      meal_plan_entries (
        id, day_of_week, slot_number,
        meals ( id, name )
      )
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Meal plans fetch error:", error);
    return { error: "loadFailed" as const };
  }

  // Normalize nested join
  const normalized = (data ?? []).map((plan: any) => ({
    ...plan,
    meal_plan_entries: (plan.meal_plan_entries ?? []).map((entry: any) => ({
      ...entry,
      meals: Array.isArray(entry.meals) ? entry.meals[0] : entry.meals,
    })),
  }));

  return { data: normalized };
}

export async function createMealPlan(clientId: string, name: string) {
  const auth = await requireCoachOwnsClient(clientId);
  if (auth.error) return { error: auth.error };

  if (!name.trim()) return { error: "nameRequired" as const };

  const { error } = await supabaseAdmin.from("meal_plans").insert({
    name: name.trim(),
    client_id: clientId,
    created_by: auth.user.id,
  });

  if (error) {
    console.error("Meal plan create error:", error);
    return { error: "createFailed" as const };
  }

  return { success: true };
}

export async function deleteMealPlan(planId: string) {
  const auth = await requireCoachOwnsMealPlan(planId);
  if (auth.error) return { error: auth.error };

  const { error } = await supabaseAdmin
    .from("meal_plans")
    .delete()
    .eq("id", planId);

  if (error) {
    console.error("Meal plan delete error:", error);
    return { error: "deleteFailed" as const };
  }

  return { success: true };
}

export async function activateMealPlan(clientId: string, planId: string) {
  const auth = await requireCoachOwnsClient(clientId);
  if (auth.error) return { error: auth.error };

  // Deactivate all plans for this client
  const { error: deactivateErr } = await supabaseAdmin
    .from("meal_plans")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("client_id", clientId);

  if (deactivateErr) {
    console.error("Deactivate error:", deactivateErr);
    return { error: "deactivateFailed" as const };
  }

  // Activate the selected one
  const { error } = await supabaseAdmin
    .from("meal_plans")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", planId)
    .eq("client_id", clientId);

  if (error) {
    console.error("Activate error:", error);
    return { error: "activateFailed" as const };
  }

  return { success: true };
}

export async function setMealPlanEntry(
  planId: string,
  dayOfWeek: number,
  slotNumber: number,
  mealId: string
) {
  const auth = await requireCoachOwnsMealPlan(planId);
  if (auth.error) return { error: auth.error };

  const { error } = await supabaseAdmin.from("meal_plan_entries").upsert(
    {
      meal_plan_id: planId,
      day_of_week: dayOfWeek,
      slot_number: slotNumber,
      meal_id: mealId,
    },
    { onConflict: "meal_plan_id,day_of_week,slot_number" }
  );

  if (error) {
    console.error("Set meal plan entry error:", error);
    return { error: "addMealFailed" as const };
  }

  return { success: true };
}

export async function removeMealPlanEntry(entryId: string) {
  const auth = await requireCoachOwnsMealPlanEntry(entryId);
  if (auth.error) return { error: auth.error };

  const { error } = await supabaseAdmin
    .from("meal_plan_entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    console.error("Remove meal plan entry error:", error);
    return { error: "removeMealFailed" as const };
  }

  return { success: true };
}

export async function addMealPlanOverride(
  clientId: string,
  date: string,
  slotNumber: number,
  mealId: string
) {
  const auth = await requireCoachOwnsClient(clientId);
  if (auth.error) return { error: auth.error };

  const { error } = await supabaseAdmin.from("meal_plan_overrides").upsert(
    {
      client_id: clientId,
      override_date: date,
      slot_number: slotNumber,
      meal_id: mealId,
      created_by: auth.user.id,
    },
    { onConflict: "client_id,override_date,slot_number" }
  );

  if (error) {
    console.error("Add override error:", error);
    return { error: "addOverrideFailed" as const };
  }

  return { success: true };
}

export async function removeMealPlanOverride(overrideId: string) {
  // We just need to be a coach to remove overrides
  const { requireCoach } = await import("@/lib/auth/require-coach");
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { error } = await supabaseAdmin
    .from("meal_plan_overrides")
    .delete()
    .eq("id", overrideId);

  if (error) {
    console.error("Remove override error:", error);
    return { error: "removeOverrideFailed" as const };
  }

  return { success: true };
}

// Re-export for use within this file
async function requireCoachOwnsMealPlanEntry(entryId: string) {
  const { requireCoach } = await import("@/lib/auth/require-coach");
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data } = await supabaseAdmin
    .from("meal_plan_entries")
    .select("id, meal_plans!inner(clients!inner(coach_id))")
    .eq("id", entryId)
    .eq("meal_plans.clients.coach_id", auth.user.id)
    .maybeSingle();

  if (!data) {
    return { error: "unauthenticated" as const };
  }

  return { user: auth.user };
}
