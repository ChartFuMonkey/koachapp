"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { subscribeToPush } from "@/lib/push-subscribe";

export default function CoachPushOptin() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted") {
      subscribeToPush().catch(console.error);
      return;
    }
    if (Notification.permission === "default") {
      // Defer so the update runs in a callback, not synchronously in the effect
      // body (satisfies react-hooks/set-state-in-effect).
      Promise.resolve().then(() => setShow(true));
    }
  }, []);

  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm === "granted") await subscribeToPush();
    setShow(false);
  }

  if (!show) return null;
  return (
    <button
      type="button"
      onClick={enable}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 py-1.5 text-[12px] text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors"
    >
      <Bell size={14} /> Enable message alerts
    </button>
  );
}
