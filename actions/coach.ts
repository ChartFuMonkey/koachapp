"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireCoach, requireCoachOwnsClient } from "@/lib/auth/require-coach";

export async function createNewClient(formData: FormData) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const email = formData.get("email") as string;
  const fullName = formData.get("full_name") as string;

  if (!email || !fullName) {
    return { error: "Email i ime su obavezni." };
  }

  const coachId = auth.user.id;

  // Build the redirect URL for the invite email
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://koachapp.vercel.app";

  // 1. Invite user by email — Supabase sends them an invite to set their password
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/set-password`,
      data: { full_name: fullName },
    });

  if (authError || !authData.user) {
    if (authError?.message?.includes("already been registered")) {
      return { error: "Korisnik s ovim emailom već postoji." };
    }
    return { error: authError?.message || "Greška pri kreiranju korisnika." };
  }

  const userId = authData.user.id;

  // 2. Insert profile
  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    full_name: fullName,
    role: "client",
    date_of_birth: (formData.get("date_of_birth") as string) || null,
    gender: (formData.get("gender") as string) || null,
    height_cm: formData.get("height_cm")
      ? parseFloat(formData.get("height_cm") as string)
      : null,
  });

  if (profileError) {
    return { error: "Greška pri kreiranju profila: " + profileError.message };
  }

  // 3. Insert client
  const parse = (key: string) => {
    const v = formData.get(key);
    if (typeof v !== "string" || v === "") return null;
    const num = parseFloat(v);
    return isNaN(num) ? null : num;
  };

  const { error: clientError } = await supabaseAdmin.from("clients").insert({
    id: userId,
    coach_id: coachId,
    start_date: new Date().toISOString().split("T")[0],
    start_weight_kg: parse("start_weight_kg"),
    target_weight_kg: parse("target_weight_kg"),
    target_calories: parse("target_calories"),
    target_protein_g: parse("target_protein_g"),
    target_carbs_g: parse("target_carbs_g"),
    target_fat_g: parse("target_fat_g"),
    notes: (formData.get("notes") as string) || null,
    injuries: (formData.get("injuries") as string) || null,
  });

  if (clientError) {
    return { error: "Greška pri kreiranju klijenta: " + clientError.message };
  }

  return { id: userId, email };
}

export async function updateClientNotes(
  clientId: string,
  notes: string,
  injuries: string
) {
  const auth = await requireCoachOwnsClient(clientId);
  if (auth.error) return { error: auth.error };

  const { error } = await supabaseAdmin
    .from("clients")
    .update({ notes, injuries, updated_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) {
    return { error: "Greška pri spremanju bilješki." };
  }
  return { success: true };
}

export async function updateClientTargets(
  clientId: string,
  data: {
    target_calories: number | null;
    target_protein_g: number | null;
    target_carbs_g: number | null;
    target_fat_g: number | null;
    target_steps: number | null;
    target_sleep_h: number | null;
  }
) {
  const auth = await requireCoachOwnsClient(clientId);
  if (auth.error) return { error: auth.error };

  const { error } = await supabaseAdmin
    .from("clients")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) {
    return { error: "Greška pri ažuriranju ciljeva." };
  }
  return { success: true };
}
