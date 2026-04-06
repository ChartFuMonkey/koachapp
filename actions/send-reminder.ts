"use server";

import { requireCoach } from "@/lib/auth/require-coach";

export async function sendReminder(clientId: string) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

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
      title: "KoachApp podsjetnik",
      body: "Ne zaboravi unijeti dnevni log!",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Send reminder error:", errText);
    return { error: "Greška pri slanju podsjetnika." };
  }

  const result = await res.json();
  return { sent: result.sent as number };
}
