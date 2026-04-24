"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { savePushSubscription } from "@/actions/push";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const json = subscription.toJSON();
  await savePushSubscription({
    endpoint: json.endpoint!,
    keys: {
      p256dh: json.keys!.p256dh!,
      auth: json.keys!.auth!,
    },
  });
}

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
    <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4 pb-2">
      <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 shadow-lg">
        <Bell size={20} className="shrink-0 text-blue-400" />
        <p className="flex-1 text-sm text-gray-300">
          {t("description")}
        </p>
        <Button size="sm" onClick={handleEnable}>
          {t("enable")}
        </Button>
        <button
          onClick={handleDismiss}
          className="text-gray-500 hover:text-gray-300"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
