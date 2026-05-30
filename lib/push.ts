// lib/push.ts
// Server-side helper that triggers the send-push Edge Function for a client.
import "server-only";

export async function sendPushToClient(
  clientId: string,
  title: string,
  body: string,
  url?: string
): Promise<{ sent?: number; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ client_id: clientId, title, body, url }),
    });
    if (!res.ok) {
      console.error("sendPushToClient failed:", await res.text());
      return { error: "sendFailed" };
    }
    const json = await res.json();
    return { sent: json.sent as number };
  } catch (err) {
    console.error("sendPushToClient error:", err);
    return { error: "sendFailed" };
  }
}
