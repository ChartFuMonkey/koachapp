"use server";

import { requireCoach } from "@/lib/auth/require-coach";
import { supabaseAdmin } from "@/lib/supabase/admin";

const REMINDER_COPY = {
  hr: {
    title: "KoachApp podsjetnik",
    body: "Ne zaboravi unijeti dnevni log!",
  },
  en: {
    title: "KoachApp reminder",
    body: "Don't forget to fill in today's log!",
  },
} as const;

export async function sendReminder(clientId: string) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  // Pick copy in the recipient's language (falls back to HR).
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("language")
    .eq("id", clientId)
    .maybeSingle();

  const lang: "hr" | "en" =
    profile?.language === "en" ? "en" : "hr";
  const { title, body } = REMINDER_COPY[lang];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      client_id: clientId,
      title,
      body,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Send reminder error:", errText);
    return { error: "sendFailed" as const };
  }

  const result = await res.json();
  return { sent: result.sent as number };
}
