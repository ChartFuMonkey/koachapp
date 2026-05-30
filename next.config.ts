import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
// @ts-expect-error -- next-pwa lacks TypeScript declarations
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  customWorkerDir: "worker",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  // Branded offline screen shown when a navigation can't reach the network.
  fallbacks: {
    document: "/offline",
  },
});

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withNextIntl(withPWA(nextConfig));
