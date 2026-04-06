"use server";

export async function sendReminder(clientId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
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
    return { error: "Greska pri slanju podsjetnika." };
  }

  const result = await res.json();
  return { sent: result.sent as number };
}
