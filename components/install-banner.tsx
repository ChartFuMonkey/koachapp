"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallBanner() {
  const t = useTranslations("installBanner");
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
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 px-4 pb-2">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
        {showIOSHint ? (
          <>
            <Share size={18} className="shrink-0 text-primary" />
            <p className="flex-1 text-sm text-ink-2">
              {t("iosHintPrefix")}{" "}
              <Share size={14} className="mb-0.5 inline" />
              {" \u2192 "}
              {t("iosHintSuffix")}
            </p>
          </>
        ) : (
          <>
            <Download size={18} className="shrink-0 text-primary" />
            <p className="flex-1 text-sm text-ink-2">
              {t("installPrompt")}
            </p>
            <Button size="sm" onClick={handleInstall}>
              {t("installCta")}
            </Button>
          </>
        )}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-ink-3 hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
