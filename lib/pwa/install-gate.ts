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
