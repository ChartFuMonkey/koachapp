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
