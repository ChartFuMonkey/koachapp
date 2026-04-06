"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("install-dismissed") === "true") {
      setDismissed(true);
      return;
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setDismissed(true);
      return;
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    const isSafari =
      /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    if (isIOS && isSafari) {
      setShowIOSHint(true);
      return;
    }

    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  function handleDismiss() {
    localStorage.setItem("install-dismissed", "true");
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSHint(false);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDismissed(true);
    }
    setDeferredPrompt(null);
  }

  if (dismissed) return null;
  if (!deferredPrompt && !showIOSHint) return null;

  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4 pb-2">
      <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 shadow-lg">
        {showIOSHint ? (
          <>
            <Share size={20} className="shrink-0 text-blue-400" />
            <p className="flex-1 text-sm text-gray-300">
              Dodaj na početni zaslon: tapni{" "}
              <Share size={14} className="mb-0.5 inline" /> ikonu dijeljenja
              {" \u2192 "}
              &quot;Dodaj na početni zaslon&quot;
            </p>
          </>
        ) : (
          <>
            <Download size={20} className="shrink-0 text-blue-400" />
            <p className="flex-1 text-sm text-gray-300">
              Instaliraj KoachApp na početni zaslon za bolje iskustvo
            </p>
            <Button size="sm" onClick={handleInstall}>
              Instaliraj
            </Button>
          </>
        )}
        <button
          onClick={handleDismiss}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-gray-500 hover:text-gray-300"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
