# Client PWA Install Gate — Design Spec

**Date:** 2026-05-30
**Branch:** feature/pwa-install-gate
**Status:** Approved design, pending implementation plan

## Goal

Make clients **install KoachApp to their Home Screen before they can use it on mobile**. When a client on a phone taps "Login as client", they are taken to a full-screen **install screen** that explains, in their browser's exact steps, how to add Koach to the Home Screen. They can only reach the client app by opening it from the Home Screen (i.e. running the installed PWA). The screen explains both **Safari (iPhone)** and **Chrome (Android)**, and never traps anyone who physically cannot install.

This replaces the existing soft, dismissible `InstallBanner` (a bottom toast inside `/app`) with a hard, pre-login gate.

## Decisions (from brainstorming)

- **Gate sits _before_ login.** The install step happens before the login form, not after. Rationale: on iOS, Safari and a Home-Screen web app do **not** share cookies/storage — a client who logs in in Safari would be logged out when they open the installed app. Installing first means they log in exactly once, inside the installed app where they'll actually use it. (On Android the installed PWA shares Chrome's cookies, so it works there too.)
- **Hard gate, but nobody gets stuck.** There is no "continue in browser anyway" escape. But:
  - **In-app browsers** (Instagram, Facebook, TikTok, etc.) cannot "Add to Home Screen". When detected, the screen shows **"Open in Safari/Chrome"** instructions + a **copy-link** fallback instead of a dead end.
  - **Returning users** see "Already installed? Just open Koach from your Home Screen."
- **Auto-detect + show the right steps.** Detect the platform and show that browser's steps prominently; the other browser's steps are one tap away (so we still "explain both Chrome and Safari"). On Android, offer a real **one-tap Install button** when the browser fires `beforeinstallprompt`; fall back to manual menu steps otherwise. iOS is always manual (Share → Add to Home Screen).
- **Scope: clients on mobile only.** The gate triggers for iOS/Android devices (phones and tablets) in a browser, on the **client** paths. **Coaches are never gated** (`/coach/*`, `/login?role=coach`), **desktop is never gated**, and anyone already running standalone passes straight through.
- **Croatian is the default UI language, English the alternate** (matches the rest of the client app).

## Background: current state

- **Next.js 16** with documented breaking changes — `node_modules/next/dist/docs/` must be consulted before writing route/client-component/metadata code (see `AGENTS.md`).
- **Landing** (`app/page.tsx`, server component): "Login as client" → `/login?role=client`; "Login as coach" → `/login?role=coach`.
- **Login** (`app/(auth)/login/page.tsx`, `"use client"`): on success with `role=client` → `router.push("/app")`; coach UUID → `/coach`.
- **Middleware** (`middleware.ts`): server-side auth routing only. `matcher: ["/", "/app/:path*", "/coach/:path*", "/login", "/set-password"]`. It **cannot** detect standalone/installed — that is a client-only signal — so enforcement of the gate must live client-side.
- **PWA already configured**: `next-pwa` (`next.config.ts`), `public/manifest.json` (`display: standalone`, `start_url: /app`, `scope: /`), icons, `appleWebApp` metadata in `app/layout.tsx`. **No manifest/icon/SW changes needed.** The service worker is registered today via `components/push-banner.tsx` (and `next-pwa register:true`).
- **Existing soft install UI**: `components/install-banner.tsx` — a dismissible bottom banner mounted in `app/app/layout.tsx`. It already contains the two detection tricks we'll reuse: `display-mode: standalone` check, iOS-Safari sniff, and the `beforeinstallprompt` capture. This banner is **superseded** by the gate and will be removed.
- **i18n**: `next-intl`, namespaced JSON in `messages/hr.json` (client UI = Croatian) and `messages/en.json`. Existing `installBanner` block at line ~749 in both.
- **Tests**: `vitest`, colocated `*.test.ts` (e.g. `lib/reports/week.test.ts`). **Local `next dev`/`next build` cannot run in this sandbox** (see env memory) — runtime verification is via the Vercel preview deploy on real devices.

## Detection: `lib/pwa/install-gate.ts` (+ tests)

Pure, framework-agnostic, unit-tested module (no React, no `window` at import time — all browser values are passed in, so it runs under `vitest`):

```ts
export type Platform = "ios" | "android" | "desktop";
export interface GateEnv {
  standalone: boolean;
  platform: Platform;
  inApp: string | null;   // in-app-browser label, e.g. "Instagram", or null
}

// Heuristics — take UA/flags as args for testability
export function getPlatform(ua: string, maxTouchPoints: number, platformStr?: string): Platform;
export function getInAppBrowser(ua: string): string | null;
export function isStandaloneFrom(matchStandalone: boolean, navStandalone?: boolean): boolean;

// The two decisions the app consumes
export function shouldGate(env: GateEnv): boolean;             // !standalone && platform !== "desktop"
export function shouldRedirectToInstall(                       // used by the guard
  pathname: string, role: string | null, env: GateEnv
): boolean;                                                    // gate AND client path (/app/* or /login?role=client)

// Thin browser reader (only place that touches window/navigator).
// SSR-safe: returns { standalone:false, platform:"desktop", inApp:null } when window is undefined.
export function readEnv(): GateEnv;
```

- `getPlatform`: iOS = `/iPad|iPhone|iPod/` **or** (`platformStr === "MacIntel"` && `maxTouchPoints > 1`) for iPadOS desktop-class UA; Android = `/Android/`; else desktop.
- `getInAppBrowser`: match known tokens → label. Covers Instagram (`Instagram`), Facebook (`FBAN|FBAV|FB_IAB`), Messenger, TikTok (`BytedanceWebview|musical_ly|TikTok`), Snapchat, Twitter/X, LinkedIn (`LinkedInApp`), WhatsApp, Line, and generic Android WebView (`; wv)`). Returns `null` if none.
- `isStandaloneFrom`: `matchMedia("(display-mode: standalone)").matches || navigator.standalone === true`.
- `shouldRedirectToInstall`: true only when `shouldGate(env)` **and** (`pathname` starts with `/app` **or** (`pathname === "/login"` and `role === "client"`)). False for `/`, `/coach/*`, `/login?role=coach`, `/set-password`, `/install`, desktop, and standalone. **`/set-password` is intentionally not gated** — clients set their password in the browser, then hit the gate when they land on `/app`.

`lib/pwa/install-gate.test.ts` drives this with a table of real UA strings (iPhone Safari, iPhone Chrome/`CriOS`, Android Chrome, Android Instagram/`FBAN`, iPad desktop-UA, desktop Chrome) asserting `getPlatform`, `getInAppBrowser`, `shouldGate`, and `shouldRedirectToInstall` for representative paths/roles.

## Enforcement: `components/install/install-gate.tsx`

A `"use client"` component mounted **once** in the root layout, wrapping `{children}`. It is the single enforcement point and the holder of the install-prompt state.

1. **Captures the install prompt** — listens for `beforeinstallprompt` (preventDefault + stash the event) and `appinstalled`. Because it's mounted in the persistent root layout, it survives client navigations and catches the event whichever route it fires on. Exposes `{ deferredPrompt, promptInstall, installed }` via a small React context for the install screen to consume.
2. **Redirects gated client paths** — in a mount `useEffect` (client-only) it reads `env = readEnv()` and, using `usePathname()` plus the role from `window.location.search` (read directly to avoid a root-level `useSearchParams` Suspense bailout), calls `router.replace("/install")` when `shouldRedirectToInstall(pathname, role, env)`. The decision runs in an effect (not during render), and `readEnv()` is SSR-safe, so the server HTML and the first client paint always agree (both render `children`) — no hydration mismatch.
3. **No flash of protected content** — default render is `children`; once the effect decides to redirect, it flips to a minimal full-screen splash (Koach mark on the app background) until the navigation lands. Desktop/standalone never flip. A gated `/app` is already unauthenticated (middleware has bounced it to `/login`), and the landing pre-empt covers the common `/login` case, so any residual flash is limited to rare direct navigation (see Risks).

## The screen: `app/install/page.tsx` + `components/install/install-screen.tsx`

- **Route `/install`** (public — deliberately **not** added to the middleware matcher, so it needs no session). SSRs a neutral shell (branding + headline, no browser-specific steps), then `<InstallScreen>` resolves `readEnv()` on the client and fills in the exact steps. A real route gives a clean URL, proper back/history, and an SSR-neutral first paint (no login-form flash).
- **`<InstallScreen>`** (`"use client"`) renders, by detected state:
  - **In-app browser** (`env.inApp` set): headline "Open Koach in your browser", body naming the app ("You're viewing this inside {app}…"), per-platform "tap ⋯ → Open in Safari/Chrome" hint, and a **Copy link** button (copies the canonical app URL) as the universal fallback.
  - **iOS**: detected pill ("iPhone · Safari"); numbered steps — (1) tap **Share** ⎙ in the Safari toolbar, (2) scroll → **Add to Home Screen** ⊞, (3) tap **Add**, then open **Koach** from the Home Screen. Inline SVG icons match the steps.
  - **Android**: detected pill ("Android · Chrome"); a one-tap **Install Koach** button when `deferredPrompt` is available (from context); plus manual fallback steps (⋮ menu → **Install app** / **Add to Home screen**). On `appinstalled`, swap to a success state: "Done — now open Koach from your Home Screen."
  - **"Show steps for another browser"** expander reveals the opposite platform's steps so both Chrome and Safari are always documented.
  - **Footer**: "Already installed? Just open Koach from your Home Screen."
  - **Not-gated visitors** (desktop, or already standalone, reaching `/install` directly): show "You're all set" + an **Open Koach** button to `/app` (desktop additionally gets a short "Koach is built for your phone" note with both step sets). Never blocks.
- Visual language matches the approved mockup and the app's design tokens (dark `#06070A`, lime `#C5F73B`, ink scale, mono micro-labels, rounded cards).

## Landing pre-empt: `components/install/login-as-client-link.tsx`

Small `"use client"` replacement for the landing "Login as client" link. After mount it computes `readEnv()`; if gated → `href="/install"`, else `/login?role=client`. This keeps the **common path flash-free** (gated users never render the login form). The `<InstallGate>` redirect remains the authoritative backstop for direct navigation/bookmarks. `app/page.tsx` stays a server component and simply renders this client link for the client button; the coach button is unchanged.

## Removals

- Remove `<InstallBanner />` from `app/app/layout.tsx` and **delete `components/install-banner.tsx`** (its detection logic is absorbed into `lib/pwa/install-gate.ts`). `PushBanner` stays (it handles SW registration + push and is unrelated).
- Remove the now-unused `installBanner` block from `messages/hr.json` and `messages/en.json`.

## i18n

New `installGate` namespace in **both** `messages/hr.json` (authoritative, Croatian) and `messages/en.json`, kept structurally in sync. Keys (icons are injected by the component, not the string):

- `headline`, `subline`, `footer`
- `pillIos`, `pillAndroid`
- `iosStep1`, `iosStep2`, `iosStep3`
- `androidInstallCta`, `androidStep1`, `androidStep2`, `androidStep3`, `androidInstalled`
- `otherBrowserToggle`
- `inAppHeadline`, `inAppBody` (takes `{app}`), `inAppStepIos`, `inAppStepAndroid`, `copyLink`, `copyLinkDone`
- `allSet`, `openApp`, `desktopNote`

## Flow (end-to-end)

1. Client opens the link in a mobile browser → landing `/`. Taps **Login as client** → `/install` (pre-empt) — or `/login?role=client`, where `<InstallGate>` immediately redirects to `/install`.
2. `/install` shows the steps for their browser. They Add to Home Screen.
3. They open **Koach** from the Home Screen → standalone launches at `start_url` `/app`.
4. Middleware sees no session in the standalone context → `/login`. `shouldGate` is now **false** (standalone) so the gate is inert; they log in **inside the app** → `/app`. ✅
5. **Returning** clients open from the Home Screen directly (standalone) → never see the gate. If they wander into the browser site, the footer line points them back to the Home Screen.

Platform notes: **Android** shares Chrome's cookies with the installed PWA, so a client who happened to set their password in Chrome is still logged in after install. **iOS** does not share cookies, so they log in once inside the installed app (the whole reason the gate is pre-login).

## Out of scope (YAGNI)

- Detecting "installed but still in browser" on iOS (no API exists) — handled by the footer hint + the standalone signal.
- Gating coaches or desktop; a desktop/PWA install flow for coaches.
- Per-app deep-link "open in browser" buttons (in-app browsers don't expose a reliable API) — we use instructions + copy-link.
- Changing the manifest, icons, service worker, or auth/session model.

## Testing & verification

- **Unit (`vitest`):** `lib/pwa/install-gate.test.ts` — UA table → `getPlatform` / `getInAppBrowser` / `shouldGate` / `shouldRedirectToInstall`. This is the high-value, browser-independent surface (TDD).
- **Component (optional):** render `<InstallScreen>` with `platform` = ios / android / in-app → assert the correct section is shown and the one-tap button appears only with a `deferredPrompt`.
- **Type/build:** `tsc` / `next build` must pass. Consult `node_modules/next/dist/docs/` before touching Next-specific code.
- **Runtime (Vercel preview, real devices):** (a) iPhone Safari — tap Login as client → install screen → Add to Home Screen → open from Home Screen → reach login → log in → app; (b) Android Chrome — one-tap Install fires, then open from Home Screen; (c) open the link inside Instagram → "Open in Safari/Chrome" + Copy link; (d) desktop browser and coach login → **not** gated; (e) returning user opens from Home Screen → no gate.

## Risk / constraints

- **UA sniffing is heuristic** and in-app browsers keep changing. Mitigations: unknown mobile UA still gets both manual step sets; the in-app screen always offers Copy link so no one is permanently trapped.
- **iOS cookie isolation** → one re-login inside the installed app. Accepted and minimised by the pre-login ordering.
- **Pre-hydration SSR flash** on direct navigation to a gated path → mitigated by the SSR-neutral `/install` shell, the landing pre-empt, and the redirect splash.
- **Next.js 16 breaking changes** → read bundled docs first; use `window.location` (not `useSearchParams`) in the gate to avoid a Suspense bailout at the root.
- **Scope safety** → gate is limited to client mobile paths; coach and desktop flows are untouched.

## Files touched (summary)

- `lib/pwa/install-gate.ts` + `lib/pwa/install-gate.test.ts` (new)
- `components/install/install-screen.tsx` (new)
- `components/install/install-gate.tsx` (new — guard + install-prompt context)
- `components/install/login-as-client-link.tsx` (new — landing pre-empt)
- `app/install/page.tsx` (new — public route, SSR-neutral shell)
- `app/layout.tsx` (mount `<InstallGate>` around children, inside the intl provider)
- `app/page.tsx` (use `<LoginAsClientLink>` for the client button)
- `app/app/layout.tsx` (remove `<InstallBanner />`)
- `components/install-banner.tsx` (delete — superseded)
- `messages/hr.json`, `messages/en.json` (add `installGate`, remove `installBanner`)
