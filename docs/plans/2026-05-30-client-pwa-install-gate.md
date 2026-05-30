# Client PWA Install Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Force clients on mobile to install KoachApp to their Home Screen (and open it from there) before they can use the client app, with a localized screen that explains both Safari and Chrome and never traps in-app-browser users.

**Architecture:** All gate logic is pure, unit-tested functions in `lib/pwa/install-gate.ts` (node-env vitest). A single client component `<InstallGate>` mounted in the root layout captures the `beforeinstallprompt` event and redirects gated client paths to a public `/install` route. `<InstallScreen>` renders platform-specific instructions. Detection is client-only (`display-mode: standalone` cannot be seen server-side), so middleware is unchanged.

**Tech Stack:** Next.js 16 (App Router, `next build --webpack`), React client components, `next-intl` (hr default / en), Tailwind tokens from `app/globals.css`, `vitest` (node env, `lib/**/*.test.ts`), `next-pwa` (already configured).

---

## Pre-flight (read before writing code)

`AGENTS.md` warns this Next.js has breaking changes vs. training data. Before writing any route/client-component code, read these bundled docs:

- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-pathname.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`

Also re-read the spec: `docs/plans/2026-05-30-client-pwa-install-gate-design.md`.

## File structure

- `lib/pwa/install-gate.ts` (new) — pure detection + decision functions. The only place logic lives.
- `lib/pwa/install-gate.test.ts` (new) — vitest table tests for the above.
- `components/install/install-gate.tsx` (new) — `<InstallGate>` provider/guard + `useInstallPrompt()` context.
- `components/install/install-screen.tsx` (new) — the localized install UI (all screen modes).
- `components/install/login-as-client-link.tsx` (new) — landing pre-empt link.
- `app/install/page.tsx` (new) — public route that renders `<InstallScreen>`.
- `app/layout.tsx` (modify) — mount `<InstallGate>` around children.
- `app/page.tsx` (modify) — use `<LoginAsClientLink>` for the client button.
- `app/app/layout.tsx` (modify) — remove `<InstallBanner/>`.
- `components/install-banner.tsx` (delete) — superseded.
- `messages/hr.json`, `messages/en.json` (modify) — add `installGate`, remove `installBanner`.

---

## Task 1: Detection + decision lib (TDD)

**Files:**
- Create: `lib/pwa/install-gate.ts`
- Test: `lib/pwa/install-gate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/pwa/install-gate.test.ts`:

```ts
import { test, expect } from "vitest";
import {
  getPlatform,
  getInAppBrowser,
  isStandaloneFrom,
  shouldGate,
  shouldRedirectToInstall,
  getScreenMode,
  type GateEnv,
} from "./install-gate";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  androidInstagram:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 Instagram 300.0.0.0 Android",
  iphoneFacebook:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/450.0.0]",
  desktopChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

test("getPlatform detects iOS, Android, desktop", () => {
  expect(getPlatform(UA.iphoneSafari)).toBe("ios");
  expect(getPlatform(UA.iphoneChrome)).toBe("ios");
  expect(getPlatform(UA.androidChrome)).toBe("android");
  expect(getPlatform(UA.desktopChrome)).toBe("desktop");
});

test("getPlatform treats touch MacIntel (iPadOS) as iOS", () => {
  expect(getPlatform(UA.desktopChrome, 5, "MacIntel")).toBe("ios");
  expect(getPlatform(UA.desktopChrome, 0, "MacIntel")).toBe("desktop");
});

test("getInAppBrowser identifies in-app webviews, null for real browsers", () => {
  expect(getInAppBrowser(UA.androidInstagram)).toBe("Instagram");
  expect(getInAppBrowser(UA.iphoneFacebook)).toBe("Facebook");
  expect(getInAppBrowser(UA.iphoneSafari)).toBeNull();
  expect(getInAppBrowser(UA.androidChrome)).toBeNull();
});

test("isStandaloneFrom is true when either signal is set", () => {
  expect(isStandaloneFrom(true)).toBe(true);
  expect(isStandaloneFrom(false, true)).toBe(true);
  expect(isStandaloneFrom(false, false)).toBe(false);
  expect(isStandaloneFrom(false)).toBe(false);
});

const env = (over: Partial<GateEnv> = {}): GateEnv => ({
  standalone: false,
  platform: "ios",
  inApp: null,
  ...over,
});

test("shouldGate: gate mobile browsers, never desktop or standalone", () => {
  expect(shouldGate(env({ platform: "ios" }))).toBe(true);
  expect(shouldGate(env({ platform: "android" }))).toBe(true);
  expect(shouldGate(env({ platform: "desktop" }))).toBe(false);
  expect(shouldGate(env({ platform: "ios", standalone: true }))).toBe(false);
});

test("shouldRedirectToInstall: only client paths on gated mobile", () => {
  const ios = env({ platform: "ios" });
  expect(shouldRedirectToInstall("/app", null, ios)).toBe(true);
  expect(shouldRedirectToInstall("/app/workout", null, ios)).toBe(true);
  expect(shouldRedirectToInstall("/login", "client", ios)).toBe(true);
  expect(shouldRedirectToInstall("/login", "coach", ios)).toBe(false);
  expect(shouldRedirectToInstall("/coach", null, ios)).toBe(false);
  expect(shouldRedirectToInstall("/", null, ios)).toBe(false);
  expect(shouldRedirectToInstall("/install", null, ios)).toBe(false);
  expect(shouldRedirectToInstall("/set-password", null, ios)).toBe(false);
  expect(shouldRedirectToInstall("/app", null, env({ platform: "desktop" }))).toBe(false);
  expect(shouldRedirectToInstall("/app", null, env({ standalone: true }))).toBe(false);
});

test("getScreenMode maps env to the right screen", () => {
  expect(getScreenMode(env({ standalone: true }))).toBe("all-set");
  expect(getScreenMode(env({ platform: "desktop" }))).toBe("desktop");
  expect(getScreenMode(env({ platform: "ios", inApp: "Instagram" }))).toBe("in-app");
  expect(getScreenMode(env({ platform: "ios" }))).toBe("ios");
  expect(getScreenMode(env({ platform: "android" }))).toBe("android");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/pwa/install-gate.test.ts`
Expected: FAIL — cannot resolve `./install-gate` (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `lib/pwa/install-gate.ts`:

```ts
export type Platform = "ios" | "android" | "desktop";

export interface GateEnv {
  standalone: boolean;
  platform: Platform;
  inApp: string | null;
}

export type ScreenMode = "all-set" | "desktop" | "in-app" | "ios" | "android";

const IN_APP_PATTERNS: Array<[RegExp, string]> = [
  [/Instagram/i, "Instagram"],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, "Facebook"],
  [/Messenger/i, "Messenger"],
  [/BytedanceWebview|musical_ly|TikTok/i, "TikTok"],
  [/Snapchat/i, "Snapchat"],
  [/Twitter/i, "X"],
  [/LinkedInApp/i, "LinkedIn"],
  [/WhatsApp/i, "WhatsApp"],
  [/Pinterest/i, "Pinterest"],
];

export function getInAppBrowser(ua: string): string | null {
  for (const [re, label] of IN_APP_PATTERNS) {
    if (re.test(ua)) return label;
  }
  // Generic Android WebView token used by many in-app browsers
  if (/;\s*wv\)/.test(ua)) return "in-app browser";
  return null;
}

export function getPlatform(
  ua: string,
  maxTouchPoints = 0,
  platformStr = ""
): Platform {
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  // iPadOS 13+ sends a desktop (MacIntel) UA but is touch-capable
  if (platformStr === "MacIntel" && maxTouchPoints > 1) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function isStandaloneFrom(
  matchStandalone: boolean,
  navStandalone?: boolean
): boolean {
  return matchStandalone === true || navStandalone === true;
}

export function shouldGate(env: GateEnv): boolean {
  return !env.standalone && env.platform !== "desktop";
}

export function shouldRedirectToInstall(
  pathname: string,
  role: string | null,
  env: GateEnv
): boolean {
  if (!shouldGate(env)) return false;
  if (pathname === "/app" || pathname.startsWith("/app/")) return true;
  if (pathname === "/login" && role === "client") return true;
  return false;
}

export function getScreenMode(env: GateEnv): ScreenMode {
  if (env.standalone) return "all-set";
  if (env.platform === "desktop") return "desktop";
  if (env.inApp) return "in-app";
  return env.platform; // "ios" | "android"
}

export function readEnv(): GateEnv {
  if (typeof window === "undefined") {
    return { standalone: false, platform: "desktop", inApp: null };
  }
  const nav = window.navigator as Navigator & {
    standalone?: boolean;
    platform?: string;
  };
  const ua = nav.userAgent || "";
  const platform = getPlatform(ua, nav.maxTouchPoints || 0, nav.platform || "");
  const standalone = isStandaloneFrom(
    window.matchMedia?.("(display-mode: standalone)").matches ?? false,
    nav.standalone
  );
  return { standalone, platform, inApp: getInAppBrowser(ua) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/pwa/install-gate.test.ts`
Expected: PASS — 7 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/pwa/install-gate.ts lib/pwa/install-gate.test.ts
git commit -m "feat(install-gate): add PWA install detection + gate decision lib"
```

---

## Task 2: i18n strings (`installGate`)

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/hr.json`

(`installBanner` stays for now — it is removed in Task 7 once nothing references it.)

- [ ] **Step 1: Add the `installGate` block to `messages/en.json`**

Insert this key directly above the existing `"installBanner"` key:

```json
  "installGate": {
    "headline": "Add Koach to your Home Screen",
    "subline": "Koach runs as an app on your phone. Add it to your Home Screen, then open it from there — that's where you log in and train.",
    "footer": "Already installed? Just open Koach from your Home Screen.",
    "pillIos": "iPhone · Safari",
    "pillAndroid": "Android · Chrome",
    "iosStep1": "Tap the Share button <icon></icon> in the Safari toolbar",
    "iosStep2": "Scroll down and choose <icon></icon> <b>Add to Home Screen</b>",
    "iosStep3": "Tap <b>Add</b>, then open <b>Koach</b> from your Home Screen",
    "androidInstallCta": "Install Koach",
    "androidStep1": "Tap the menu <icon></icon> in Chrome",
    "androidStep2": "Choose <b>Install app</b> (or <b>Add to Home screen</b>)",
    "androidStep3": "Confirm, then open <b>Koach</b> from your Home Screen",
    "androidInstalled": "Done — now open Koach from your Home Screen.",
    "otherBrowserToggle": "Using a different browser?",
    "inAppHeadline": "Open Koach in your browser",
    "inAppBody": "You're viewing this inside {app}. To install Koach, open it in Safari or Chrome first.",
    "inAppStepIos": "Tap <icon></icon> at the top, then <b>Open in Safari</b>.",
    "inAppStepAndroid": "Tap <icon></icon>, then <b>Open in Chrome</b>.",
    "copyLink": "Copy link",
    "copyLinkDone": "Copied!",
    "allSet": "You're all set.",
    "openApp": "Open Koach",
    "desktopNote": "Koach is built for your phone. Open this page on your phone to install it."
  },
```

- [ ] **Step 2: Add the matching `installGate` block to `messages/hr.json`** (Croatian — authoritative client language)

Insert directly above the existing `"installBanner"` key:

```json
  "installGate": {
    "headline": "Dodaj Koach na početni zaslon",
    "subline": "Koach radi kao aplikacija na tvom telefonu. Dodaj ga na početni zaslon, a zatim ga otvori odande — ondje se prijavljuješ i treniraš.",
    "footer": "Već instalirano? Samo otvori Koach s početnog zaslona.",
    "pillIos": "iPhone · Safari",
    "pillAndroid": "Android · Chrome",
    "iosStep1": "Dodirni gumb Podijeli <icon></icon> u alatnoj traci Safarija",
    "iosStep2": "Pomakni se dolje i odaberi <icon></icon> <b>Dodaj na početni zaslon</b>",
    "iosStep3": "Dodirni <b>Dodaj</b>, zatim otvori <b>Koach</b> s početnog zaslona",
    "androidInstallCta": "Instaliraj Koach",
    "androidStep1": "Dodirni izbornik <icon></icon> u Chromeu",
    "androidStep2": "Odaberi <b>Instaliraj aplikaciju</b> (ili <b>Dodaj na početni zaslon</b>)",
    "androidStep3": "Potvrdi, zatim otvori <b>Koach</b> s početnog zaslona",
    "androidInstalled": "Gotovo — sada otvori Koach s početnog zaslona.",
    "otherBrowserToggle": "Koristiš drugi preglednik?",
    "inAppHeadline": "Otvori Koach u pregledniku",
    "inAppBody": "Ovo gledaš unutar aplikacije {app}. Da bi instalirao Koach, prvo ga otvori u Safariju ili Chromeu.",
    "inAppStepIos": "Dodirni <icon></icon> gore i odaberi <b>Otvori u Safariju</b>.",
    "inAppStepAndroid": "Dodirni <icon></icon> i odaberi <b>Otvori u Chromeu</b>.",
    "copyLink": "Kopiraj poveznicu",
    "copyLinkDone": "Kopirano!",
    "allSet": "Sve je spremno.",
    "openApp": "Otvori Koach",
    "desktopNote": "Koach je napravljen za tvoj telefon. Otvori ovu stranicu na telefonu da bi ga instalirao."
  },
```

- [ ] **Step 3: Validate both JSON files parse**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/hr.json','utf8'));console.log('json ok')"`
Expected: `json ok`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/hr.json
git commit -m "feat(install-gate): add installGate i18n strings (hr/en)"
```

---

## Task 3: `<InstallGate>` provider + guard, mounted in root layout

**Files:**
- Create: `components/install/install-gate.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `components/install/install-gate.tsx`**

```tsx
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
```

- [ ] **Step 2: Mount `<InstallGate>` in `app/layout.tsx`**

Add the import near the other component imports (after the `Toaster` import):

```tsx
import InstallGate from "@/components/install/install-gate";
```

Replace the body's provider children:

```tsx
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
```

with:

```tsx
        <NextIntlClientProvider locale={locale} messages={messages}>
          <InstallGate>{children}</InstallGate>
        </NextIntlClientProvider>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`/install` is referenced as a string only; the route is added in Task 5.)

- [ ] **Step 4: Commit**

```bash
git add components/install/install-gate.tsx app/layout.tsx
git commit -m "feat(install-gate): mount InstallGate guard + install-prompt context"
```

---

## Task 4: `<InstallScreen>` UI

**Files:**
- Create: `components/install/install-screen.tsx`

- [ ] **Step 1: Create `components/install/install-screen.tsx`**

```tsx
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

If `bg-lime-hover`, `border-hairline-2`, `border-hairline`, `text-ink-3`, `surface-1`, or `surface-2` are flagged as unknown, confirm them against `app/globals.css` (they are used by `app/page.tsx` and `components/install-banner.tsx`, so they exist) and adjust class names to match.

- [ ] **Step 3: Commit**

```bash
git add components/install/install-screen.tsx
git commit -m "feat(install-gate): localized install screen (iOS/Android/in-app/desktop)"
```

---

## Task 5: `/install` route

**Files:**
- Create: `app/install/page.tsx`

- [ ] **Step 1: Create `app/install/page.tsx`**

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import InstallScreen from "@/components/install/install-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("installGate");
  return { title: t("headline") };
}

export default function InstallPage() {
  return <InstallScreen />;
}
```

- [ ] **Step 2: Confirm `/install` is NOT auth-gated**

Open `middleware.ts` and confirm its `matcher` does **not** include `/install` (current matcher: `["/", "/app/:path*", "/coach/:path*", "/login", "/set-password"]`). No change needed — `/install` must stay public so unauthenticated, not-yet-installed clients can reach it.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/install/page.tsx
git commit -m "feat(install-gate): add public /install route"
```

---

## Task 6: Landing pre-empt link

**Files:**
- Create: `components/install/login-as-client-link.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `components/install/login-as-client-link.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readEnv, shouldGate } from "@/lib/pwa/install-gate";

export default function LoginAsClientLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  // Default to the normal login URL (SSR-safe); swap to /install after mount
  // if this is a gated mobile browser, so the common path never flashes /login.
  const [href, setHref] = useState("/login?role=client");
  useEffect(() => {
    if (shouldGate(readEnv())) setHref("/install");
  }, []);
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
```

- [ ] **Step 2: Use it in `app/page.tsx`**

Add the import at the top (after the existing imports):

```tsx
import LoginAsClientLink from "@/components/install/login-as-client-link";
```

Replace the client `<Link>` block:

```tsx
          <Link
            href="/login?role=client"
            className="w-full inline-flex items-center justify-center rounded-lg bg-lime px-4 py-4 text-sm font-bold uppercase tracking-[0.02em] text-bg hover:bg-lime-hover active:bg-lime-press transition-all"
          >
            {t("loginAsClient")} →
          </Link>
```

with:

```tsx
          <LoginAsClientLink
            className="w-full inline-flex items-center justify-center rounded-lg bg-lime px-4 py-4 text-sm font-bold uppercase tracking-[0.02em] text-bg hover:bg-lime-hover active:bg-lime-press transition-all"
          >
            {t("loginAsClient")} →
          </LoginAsClientLink>
```

Leave the coach `<Link>` unchanged. (The `Link` import stays — it's still used by the coach button.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/install/login-as-client-link.tsx app/page.tsx
git commit -m "feat(install-gate): pre-empt client login to /install on gated mobile"
```

---

## Task 7: Remove the superseded soft install banner

**Files:**
- Modify: `app/app/layout.tsx`
- Delete: `components/install-banner.tsx`
- Modify: `messages/en.json`, `messages/hr.json`

- [ ] **Step 1: Remove the import and mount in `app/app/layout.tsx`**

Delete the import line:

```tsx
import InstallBanner from "@/components/install-banner";
```

And delete the mount (it sits right after `<PushBanner />`):

```tsx
          <InstallBanner />
```

Leave `<PushBanner />` in place (it registers the service worker + push — unrelated to the gate).

- [ ] **Step 2: Delete the component file**

```bash
git rm components/install-banner.tsx
```

- [ ] **Step 3: Remove the now-unused `installBanner` i18n block**

Delete the `"installBanner": { ... }` object from **both** `messages/en.json` and `messages/hr.json`.

- [ ] **Step 4: Verify nothing else references the removed symbols**

Run: `grep -rn "install-banner\|InstallBanner\|installBanner" app components messages lib`
Expected: no matches.

- [ ] **Step 5: Validate JSON + type-check**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/hr.json','utf8'));console.log('json ok')" && npx tsc --noEmit`
Expected: `json ok` and no type errors.

- [ ] **Step 6: Commit**

```bash
git add app/app/layout.tsx messages/en.json messages/hr.json
git commit -m "refactor(install-gate): retire soft InstallBanner, superseded by gate"
```

---

## Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: all tests pass, including `lib/pwa/install-gate.test.ts`.

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no type errors; lint clean (fix any new warnings introduced by the new files).

- [ ] **Step 3: Production build** (if the environment allows; otherwise this runs on Vercel)

Run: `npm run build`
Expected: build succeeds. Per env memory, `next build`/`next dev` may not complete in the local sandbox — if so, rely on the Vercel preview build for this gate.

- [ ] **Step 4: Push the branch and verify on the Vercel preview deploy (real devices)**

```bash
git push -u origin feature/pwa-install-gate
```

Then on the preview URL:
- **iPhone / Safari:** open landing → tap "Login as client" → install screen with Safari steps → Add to Home Screen → open Koach from Home Screen → reaches `/login` inside the app → log in → `/app`. ✅
- **Android / Chrome:** tap "Login as client" → install screen; the one-tap **Install Koach** button appears (when `beforeinstallprompt` fires) → install → open from Home Screen → reaches the app.
- **Inside Instagram (in-app browser):** open the preview link in an Instagram DM → "Open Koach in your browser" + working **Copy link**.
- **Desktop browser:** "Login as client" works normally (no gate). Visiting `/install` directly shows "You're all set" / desktop note.
- **Coach:** "Login as coach" on mobile is **not** gated.
- **Returning user:** open Koach from the Home Screen (standalone) → straight into the app, no gate.

---

## Self-review notes (spec coverage)

- Pre-login gate ordering → Task 3 redirect + Task 6 pre-empt; login happens inside standalone (gate inert when `standalone`).
- Hard gate + in-app escape + returning-user hint → Task 4 (`in-app` mode with Copy link; `footer`).
- Auto-detect + show right steps + one-tap on Android + "explain both" → Task 4 (`getScreenMode`, `canPrompt` button, "other browser" toggle).
- Clients-on-mobile scope; coaches/desktop untouched → Task 1 `shouldRedirectToInstall` + tests.
- Croatian default / English alt → Task 2.
- Remove old soft banner → Task 7.
- No middleware/manifest/SW changes → confirmed in Task 5 Step 2; none of the tasks touch them.
