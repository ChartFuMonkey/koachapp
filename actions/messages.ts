"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Message = {
  id: string;
  client_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

const COACH_UUID = process.env.NEXT_PUBLIC_COACH_UUID;

function actor(): "coach" | "client" | null {
  return null; // sentinel — actual check is done inside via auth
}
void actor;

export async function sendMessage(
  clientId: string,
  body: string
): Promise<{ data?: Message; error?: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "emptyBody" };
  if (trimmed.length > 2000) return { error: "tooLong" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  // Sender must be either the coach (writing to any client) or the client themselves
  const isCoach = user.id === COACH_UUID;
  if (!isCoach && user.id !== clientId) {
    return { error: "forbidden" };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      client_id: clientId,
      sender_id: user.id,
      body: trimmed,
    })
    .select("*")
    .single();

  if (error) {
    console.error("sendMessage error", error);
    return { error: "sendFailed" };
  }

  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/app");
  return { data: data as Message };
}

export async function listMessages(
  clientId: string,
  limit = 50
): Promise<{ data?: Message[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const isCoach = user.id === COACH_UUID;
  if (!isCoach && user.id !== clientId) {
    return { error: "forbidden" };
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listMessages error", error);
    return { error: "loadFailed" };
  }

  return { data: ((data ?? []) as Message[]).reverse() };
}

export async function markMessagesRead(
  clientId: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const isCoach = user.id === COACH_UUID;
  if (!isCoach && user.id !== clientId) {
    return { error: "forbidden" };
  }

  // Mark messages from the other party as read
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .is("read_at", null)
    .neq("sender_id", user.id);

  if (error) {
    console.error("markMessagesRead error", error);
    return { error: "updateFailed" };
  }
  return { ok: true };
}

export async function getUnreadCount(
  clientId: string
): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId)
    .is("read_at", null)
    .neq("sender_id", user.id);

  return count ?? 0;
}

/** Per-client unread counts for the coach: client-sent messages not yet read. */
export async function getCoachUnreadCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== COACH_UUID) return {};

  const { data, error } = await supabase
    .from("messages")
    .select("client_id")
    .is("read_at", null)
    .neq("sender_id", user.id);

  if (error) {
    console.error("getCoachUnreadCounts error", error);
    return {};
  }
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const cid = (row as { client_id: string }).client_id;
    counts[cid] = (counts[cid] ?? 0) + 1;
  }
  return counts;
}
