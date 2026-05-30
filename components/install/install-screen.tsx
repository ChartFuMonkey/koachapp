"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { readEnv, getScreenMode, type GateEnv } from "@/lib/pwa/install-gate";
import { useInstallPrompt } from "@/components/install/install-gate";

function ShareIcon() {
  return (
    <svg className="inline size-[1.05em] -translate-y-px text-lime" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
function AddBoxIcon() {
  return (
    <svg className="inline size-[1.05em] -translate-y-px text-lime" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg className="inline size-[1.05em] -translate-y-px text-lime" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

type RichKey = "iosStep1" | "iosStep2" | "iosStep3" | "androidStep1" | "androidStep2" | "androidStep3" | "inAppStepIos" | "inAppStepAndroid";

export default function InstallScreen() {
  const t = useTranslations("installGate");
  const { canPrompt, installed, promptInstall } = useInstallPrompt();
  const [env, setEnv] = useState<GateEnv | null>(null);
  const [showOther, setShowOther] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEnv(readEnv());
  }, []);

  const mode = env ? getScreenMode(env) : null;

  // Rich-text renderer: <icon/> swaps in the right glyph per key; <b> bolds.
  function rich(key: RichKey, icon: React.ReactNode) {
    return t.rich(key, {
      icon: () => <>{icon}</>,
      b: (chunks) => <b className="font-semibold text-ink">{chunks}</b>,
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
    <div className="flex items-start gap-3">
      <span className="flex size-[26px] flex-none items-center justify-center rounded-full border-[1.5px] border-lime text-[13px] font-bold text-lime">
        {n}
      </span>
      <span className="text-[13.5px] leading-relaxed text-ink-2">{children}</span>
    </div>
  );

  const IosSteps = () => (
    <div className="flex flex-col gap-3.5">
      <Step n={1}>{rich("iosStep1", <ShareIcon />)}</Step>
      <Step n={2}>{rich("iosStep2", <AddBoxIcon />)}</Step>
      <Step n={3}>{rich("iosStep3", null)}</Step>
    </div>
  );

  const AndroidSteps = () =>
    installed ? (
      <p
        className="rounded-lg border px-4 py-3 text-sm text-ink"
        style={{ background: "rgba(197,247,59,0.10)", borderColor: "rgba(197,247,59,0.30)" }}
      >
        {t("androidInstalled")}
      </p>
    ) : (
      <div className="flex flex-col gap-4">
        {canPrompt && (
          <button
            onClick={() => promptInstall()}
            className="w-full rounded-lg bg-lime px-4 py-3.5 text-sm font-bold uppercase tracking-[0.02em] text-bg transition-colors hover:bg-lime-hover"
          >
            {t("androidInstallCta")}
          </button>
        )}
        <div className="flex flex-col gap-3.5">
          <Step n={1}>{rich("androidStep1", <MenuIcon />)}</Step>
          <Step n={2}>{rich("androidStep2", null)}</Step>
          <Step n={3}>{rich("androidStep3", null)}</Step>
        </div>
      </div>
    );

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="relative flex min-h-screen flex-col items-center bg-bg px-6 pb-12 pt-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 12%, rgba(197,247,59,0.12), transparent 55%)" }}
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-lime text-2xl font-bold text-bg" style={{ boxShadow: "0 8px 30px rgba(197,247,59,0.35)" }}>
          K
        </div>
        {children}
      </div>
    </div>
  );

  // Pre-mount / SSR: neutral shell (branding + headline + subline, no steps).
  if (mode === null) {
    return (
      <Shell>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-ink">{t("headline")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">{t("subline")}</p>
      </Shell>
    );
  }

  if (mode === "all-set") {
    return (
      <Shell>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-ink">{t("allSet")}</h1>
        <Link href="/app" className="mt-7 w-full rounded-lg bg-lime px-4 py-3.5 text-sm font-bold uppercase tracking-[0.02em] text-bg transition-colors hover:bg-lime-hover">
          {t("openApp")}
        </Link>
      </Shell>
    );
  }

  if (mode === "in-app") {
    const isIos = env?.platform === "ios";
    return (
      <Shell>
        <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-ink">{t("inAppHeadline")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">{t("inAppBody", { app: env?.inApp ?? "" })}</p>
        <div className="mt-6 w-full rounded-xl border border-border bg-surface-2 p-4 text-left">
          <Step n={1}>{rich(isIos ? "inAppStepIos" : "inAppStepAndroid", <MenuIcon />)}</Step>
        </div>
        <button onClick={copyLink} className="mt-4 w-full rounded-lg border border-hairline-2 bg-surface-1 px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
          {copied ? t("copyLinkDone") : t("copyLink")}
        </button>
      </Shell>
    );
  }

  // mode === "ios" | "android" | "desktop"
  const primaryIsIos = mode === "ios" || mode === "desktop";
  return (
    <Shell>
      <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-ink">{t("headline")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">{t("subline")}</p>

      {mode === "desktop" && (
        <p className="mt-4 rounded-lg border border-hairline-2 bg-surface-1 px-3 py-2 text-xs text-ink-3">{t("desktopNote")}</p>
      )}

      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2">
        <span className="size-1.5 rounded-full bg-lime" />
        {primaryIsIos ? t("pillIos") : t("pillAndroid")}
      </div>

      <div className="mt-6 w-full rounded-xl border border-border bg-surface-2 p-4 text-left">
        {primaryIsIos ? <IosSteps /> : <AndroidSteps />}
      </div>

      <button
        onClick={() => setShowOther((v) => !v)}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-hairline-2 bg-surface-1 px-4 py-3 text-left text-[13px] font-medium text-ink-2"
      >
        {t("otherBrowserToggle")}
        <span className="text-ink-3">{showOther ? "−" : "+"}</span>
      </button>
      {showOther && (
        <div className="mt-2 w-full rounded-xl border border-border bg-surface-2 p-4 text-left">
          {primaryIsIos ? <AndroidSteps /> : <IosSteps />}
        </div>
      )}

      <p className="mt-7 border-t border-hairline pt-5 text-xs leading-relaxed text-ink-3">{t("footer")}</p>
    </Shell>
  );
}
