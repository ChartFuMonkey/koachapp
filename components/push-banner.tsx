"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeToPush } from "@/lib/push-subscribe";

export default function PushBanner() {
  const t = useTranslations("pushBanner");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!("serviceWorker" in navigator)) return;

    if (Notification.permission === "granted") {
      // Already granted — silently ensure subscription exists
      subscribeToPush().catch(console.error);
      return;
    }

    if (
      Notification.permission === "default" &&
      localStorage.getItem("push-dismissed") !== "true"
    ) {
      setVisible(true);
    }
  }, []);

  async function handleEnable() {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await subscribeToPush();
    }
    setVisible(false);
  }

  function handleDismiss() {
    localStorage.setItem("push-dismissed", "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 px-4 pb-2">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
        <Bell size={18} className="shrink-0 text-primary" />
        <p className="flex-1 text-sm text-ink-2">
          {t("description")}
        </p>
        <Button size="sm" onClick={handleEnable}>
          {t("enable")}
        </Button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="text-ink-3 hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
