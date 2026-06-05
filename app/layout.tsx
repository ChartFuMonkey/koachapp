import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import InstallGate from "@/components/install/install-gate";
import { resolveLocale } from "@/i18n/request";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Drives installability theming AND fixes safe-area insets on notched iPhones
// (env(safe-area-inset-*) resolves to 0 without viewport-fit=cover).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06070A",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("title"),
    description: t("description"),
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Koach",
    },
    // Icons come from file conventions (app/favicon.ico, app/icon.svg,
    // app/apple-icon.png). Next.js auto-detects these and they take priority
    // over a metadata `icons` field. PWA/Android icons live in manifest.json.
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await resolveLocale();
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col dark">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <InstallGate>{children}</InstallGate>
        </NextIntlClientProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
