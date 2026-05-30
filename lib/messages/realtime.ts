"use client";

import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Message } from "@/actions/messages";

/**
 * Ensure the Realtime socket carries the logged-in user's JWT, so Postgres
 * Changes are delivered under that user's RLS policies. Without this the
 * subscription connects but silently receives nothing.
 *
 * `setAuth` is async in @supabase/realtime-js 2.x and returns a Promise.
 */
export async function ensureRealtimeAuth(supabase: SupabaseClient): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    await supabase.realtime.setAuth(session.access_token);
  }
}

// Multiple hooks may watch the same client on one page (e.g. the nav unread
// badge and the home preview). Supabase needs a distinct channel topic per
// subscription, so we append a process-unique sequence number.
let channelSeq = 0;
function nextChannelId(): number {
  channelSeq += 1;
  return channelSeq;
}

interface SubscribeArgs {
  /** Filter to one client's thread, or null for the coach (all threads). */
  clientId: string | null;
  onInsert: (m: Message) => void;
  onUpdate: (m: Message) => void;
  /** Called whenever the channel (re)subscribes successfully — use to backfill. */
  onResubscribe?: () => void;
}

/**
 * Subscribe to INSERT/UPDATE on public.messages. Returns the channel; caller
 * must `supabase.removeChannel(channel)` on cleanup.
 *
 * A `filter` of `undefined` (coach case) is serialized away, so the coach
 * receives every thread — still gated by the messages_select_coach RLS policy.
 */
export function subscribeToMessages(
  supabase: SupabaseClient,
  { clientId, onInsert, onUpdate, onResubscribe }: SubscribeArgs
): RealtimeChannel {
  const filter = clientId ? `client_id=eq.${clientId}` : undefined;
  const base = clientId ? `messages:${clientId}` : "messages:all";
  const channelName = `${base}:${nextChannelId()}`;

  return supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter },
      (payload) => onInsert(payload.new as Message)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter },
      (payload) => onUpdate(payload.new as Message)
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") onResubscribe?.();
    });
}
