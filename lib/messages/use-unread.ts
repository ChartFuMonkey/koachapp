"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUnreadCount, getCoachUnreadCounts } from "@/actions/messages";
import { ensureRealtimeAuth, subscribeToMessages } from "./realtime";

/** Debounce helper that survives re-renders. */
function useDebouncedCallback(fn: () => void, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  // Keep the latest fn without writing the ref during render.
  useEffect(() => {
    fnRef.current = fn;
  });
  // Clear any pending timer on unmount.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  return useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(), ms);
  }, [ms]);
}

/** Live unread count for a client's own thread. */
export function useClientUnread(userId: string, initial = 0): number {
  const [count, setCount] = useState(initial);

  const reload = useDebouncedCallback(() => {
    getUnreadCount(userId).then(setCount);
  }, 300);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: ReturnType<typeof subscribeToMessages> | null = null;
    (async () => {
      await ensureRealtimeAuth(supabase);
      if (cancelled) return;
      channel = subscribeToMessages(supabase, {
        clientId: userId,
        onInsert: reload,
        onUpdate: reload,
        onResubscribe: reload,
      });
    })();
    // Realtime delivery stops if the socket's JWT expires; re-sync on wake.
    const onWake = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return count;
}

/** Live per-client unread counts for the coach. */
export function useCoachUnread(
  initial: Record<string, number>
): Record<string, number> {
  const [counts, setCounts] = useState(initial);

  const reload = useDebouncedCallback(() => {
    getCoachUnreadCounts().then(setCounts);
  }, 300);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: ReturnType<typeof subscribeToMessages> | null = null;
    (async () => {
      await ensureRealtimeAuth(supabase);
      if (cancelled) return;
      channel = subscribeToMessages(supabase, {
        clientId: null, // coach: all threads
        onInsert: reload,
        onUpdate: reload,
        onResubscribe: reload,
      });
    })();
    // Realtime delivery stops if the socket's JWT expires; re-sync on wake.
    const onWake = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return counts;
}
