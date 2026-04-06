"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getClientPhases(clientId: string) {
  const { data, error } = await supabaseAdmin
    .from("phases")
    .select("*")
    .eq("client_id", clientId)
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Phases fetch error:", error);
    return { error: "Greška pri dohvaćanju faza." };
  }

  return { data: data ?? [] };
}

export async function createPhase(clientId: string, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Naziv faze je obavezan." };

  const startDate = formData.get("start_date") as string;
  if (!startDate) return { error: "Datum početka je obavezan." };

  const targetKcal = formData.get("target_kcal") as string;

  const { error } = await supabaseAdmin.from("phases").insert({
    client_id: clientId,
    name,
    type: (formData.get("type") as string) || null,
    start_date: startDate,
    end_date: (formData.get("end_date") as string) || null,
    target_kcal: targetKcal ? parseInt(targetKcal) : null,
    notes: (formData.get("notes") as string) || null,
    is_active: false,
  });

  if (error) {
    console.error("Phase create error:", error);
    return { error: "Greška pri kreiranju faze." };
  }

  return { success: true };
}

export async function activatePhase(clientId: string, phaseId: string) {
  // Deactivate all phases for this client
  const { error: deactivateErr } = await supabaseAdmin
    .from("phases")
    .update({ is_active: false })
    .eq("client_id", clientId);

  if (deactivateErr) {
    console.error("Phase deactivate error:", deactivateErr);
    return { error: "Greška pri deaktivaciji faza." };
  }

  // Activate the selected phase
  const { data: phase, error: activateErr } = await supabaseAdmin
    .from("phases")
    .update({ is_active: true })
    .eq("id", phaseId)
    .select("target_kcal")
    .single();

  if (activateErr) {
    console.error("Phase activate error:", activateErr);
    return { error: "Greška pri aktivaciji faze." };
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
  const { error } = await supabaseAdmin
    .from("phases")
    .delete()
    .eq("id", phaseId);

  if (error) {
    console.error("Phase delete error:", error);
    return { error: "Greška pri brisanju faze." };
  }

  return { success: true };
}
