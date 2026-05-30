"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { readEnv, shouldRedirectToInstall } from "@/lib/pwa/install-gate";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

interface InstallPromptValue {
  canPrompt: boolean;
  installed: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

const InstallPromptContext = createContext<InstallPromptValue>({
  canPrompt: false,
  installed: false,
  promptInstall: async () => "unavailable",
});

export function useInstallPrompt() {
  return useContext(InstallPromptContext);
}

export default function InstallGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Capture the install prompt (Android/desktop Chromium) + install success.
  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Enforce the gate on client paths. Runs in an effect (client-only) so SSR
  // and first client paint agree (both render children) — no hydration mismatch.
  useEffect(() => {
    const role = new URLSearchParams(window.location.search).get("role");
    if (shouldRedirectToInstall(pathname, role, readEnv())) {
      setRedirecting(true);
      router.replace("/install");
    } else {
      setRedirecting(false);
    }
  }, [pathname, router]);

  const promptInstall: InstallPromptValue["promptInstall"] = async () => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome;
  };

  return (
    <InstallPromptContext.Provider
      value={{ canPrompt: !!deferredPrompt, installed, promptInstall }}
    >
      {redirecting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg">
          <div className="flex size-12 items-center justify-center rounded-xl bg-lime text-bg text-xl font-bold">
            K
          </div>
        </div>
      ) : (
        children
      )}
    </InstallPromptContext.Provider>
  );
}
