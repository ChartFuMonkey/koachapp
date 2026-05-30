"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  listMessages,
  sendMessage,
  markMessagesRead,
  type Message,
} from "@/actions/messages";
import { mergeIncoming, applyReadReceipt } from "./thread-state";
import { ensureRealtimeAuth, subscribeToMessages } from "./realtime";

interface Args {
  clientId: string;
  currentUserId: string;
  /** Pass false to defer loading/subscribing (e.g. closed coach dialog). */
  active?: boolean;
}

export function useMessageThread({ clientId, currentUserId, active = true }: Args) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // currentUserId is part of the public hook contract (callers pass it for
  // clarity / future use); the thread is keyed by clientId.
  void currentUserId;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const supabase = createClient();

    // Load + backfill the thread. setState lives inside the promise callback —
    // the React-blessed pattern for effects (no synchronous setState in body).
    const load = () => {
      listMessages(clientId).then((res) => {
        if (cancelled) return;
        if (res.error) {
          setError(res.error);
        } else {
          setMessages(res.data ?? []);
          setError(null);
        }
        setLoading(false);
      });
    };
    load();

    let channel: ReturnType<typeof subscribeToMessages> | null = null;
    (async () => {
      await ensureRealtimeAuth(supabase);
      if (cancelled) return;
      channel = subscribeToMessages(supabase, {
        clientId,
        onInsert: (m) => setMessages((prev) => mergeIncoming(prev, m)),
        onUpdate: (m) => setMessages((prev) => applyReadReceipt(prev, m)),
        onResubscribe: load, // backfill anything missed while offline
      });
    })();

    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      if (channel) supabase.removeChannel(channel);
    };
  }, [active, clientId]);

  const send = useCallback(
    async (body: string): Promise<{ data?: Message; error?: string }> => {
      const res = await sendMessage(clientId, body);
      if (res.error || !res.data) return { error: res.error ?? "sendFailed" };
      setMessages((prev) => mergeIncoming(prev, res.data!));
      return { data: res.data };
    },
    [clientId]
  );

  const markRead = useCallback(() => {
    markMessagesRead(clientId).catch(() => {});
  }, [clientId]);

  return { messages, loading, error, send, markRead };
}
