"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  requireCoachOwnsClient,
  requireCoachOwnsPhase,
} from "@/lib/auth/require-coach";

export async function getClientPhases(clientId: string) {
  const auth = await requireCoachOwnsClient(clientId);
  if (auth.error) return { error: auth.error };

  const { data, error } = await supabaseAdmin
    .from("phases")
    .select("*")
    .eq("client_id", clientId)
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Phases fetch error:", error);
    return { error: "loadFailed" as const };
  }

  return { data: data ?? [] };
}

// Shared extraction of the editable phase fields from a form.
function phaseFieldsFromForm(formData: FormData) {
  const intOrNull = (key: string) => {
    const raw = (formData.get(key) as string) ?? "";
    if (raw.trim() === "") return null;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  };
  const textOrNull = (key: string) => {
    const raw = (formData.get(key) as string) ?? "";
    return raw.trim() === "" ? null : raw.trim();
  };
  return {
    type: (formData.get("type") as string) || null,
    end_date: (formData.get("end_date") as string) || null,
    target_kcal: intOrNull("target_kcal"),
    target_protein_g: intOrNull("target_protein_g"),
    target_steps: intOrNull("target_steps"),
    cardio_note: textOrNull("cardio_note"),
    lift_volume_note: textOrNull("lift_volume_note"),
    weighin_freq: textOrNull("weighin_freq"),
    notes: textOrNull("notes"),
  };
}

export async function createPhase(clientId: string, formData: FormData) {
  const auth = await requireCoachOwnsClient(clientId);
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "nameRequired" as const };

  const startDate = formData.get("start_date") as string;
  if (!startDate) return { error: "startDateRequired" as const };

  const { error } = await supabaseAdmin.from("phases").insert({
    client_id: clientId,
    name,
    start_date: startDate,
    is_active: false,
    ...phaseFieldsFromForm(formData),
  });

  if (error) {
    console.error("Phase create error:", error);
    return { error: "createFailed" as const };
  }

  return { success: true };
}

export async function updatePhase(phaseId: string, formData: FormData) {
  const auth = await requireCoachOwnsPhase(phaseId);
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "nameRequired" as const };

  const startDate = formData.get("start_date") as string;
  if (!startDate) return { error: "startDateRequired" as const };

  const fields = phaseFieldsFromForm(formData);

  const { error } = await supabaseAdmin
    .from("phases")
    .update({ name, start_date: startDate, ...fields })
    .eq("id", phaseId);

  if (error) {
    console.error("Phase update error:", error);
    return { error: "updateFailed" as const };
  }

  // Keep the client's live calorie target in sync when editing the active phase.
  if (auth.phase?.is_active && fields.target_kcal != null) {
    await supabaseAdmin
      .from("clients")
      .update({
        target_calories: fields.target_kcal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.phase.client_id);
  }

  return { success: true };
}

export async function activatePhase(clientId: string, phaseId: string) {
  const auth = await requireCoachOwnsClient(clientId);
  if (auth.error) return { error: auth.error };

  // Deactivate all phases for this client
  const { error: deactivateErr } = await supabaseAdmin
    .from("phases")
    .update({ is_active: false })
    .eq("client_id", clientId);

  if (deactivateErr) {
    console.error("Phase deactivate error:", deactivateErr);
    return { error: "deactivateFailed" as const };
  }

  // Activate the selected phase
  const { data: phase, error: activateErr } = await supabaseAdmin
    .from("phases")
    .update({ is_active: true })
    .eq("id", phaseId)
    .eq("client_id", clientId)
    .select("target_kcal")
    .single();

  if (activateErr) {
    console.error("Phase activate error:", activateErr);
    return { error: "activateFailed" as const };
  }

  // Update client's target_calories if phase has target_kcal
  if (phase?.target_kcal != null) {
    await supabaseAdmin
      .from("clients")
      .update({
        target_calories: phase.target_kcal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId);
  }

  return { success: true };
}

export async function deletePhase(phaseId: string) {
  const auth = await requireCoachOwnsPhase(phaseId);
  if (auth.error) return { error: auth.error };

  const { error } = await supabaseAdmin
    .from("phases")
    .delete()
    .eq("id", phaseId);

  if (error) {
    console.error("Phase delete error:", error);
    return { error: "deleteFailed" as const };
  }

  return { success: true };
}
