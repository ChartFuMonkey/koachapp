"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import PushBanner from "@/components/push-banner";
import InstallBanner from "@/components/install-banner";

const tabs = [
  { key: "home", route: "/app", glyph: "◉", glyphActive: "◉" },
  { key: "log", route: "/app/log", glyph: "◍", glyphActive: "◍" },
  { key: "workout", route: "/app/workout", glyph: "◎", glyphActive: "◉" },
  { key: "checkin", route: "/app/checkin", glyph: "◑", glyphActive: "◑" },
  { key: "profile", route: "/app/profile", glyph: "◐", glyphActive: "◐" },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("app.nav");

  return (
    <div className="bg-bg min-h-screen">
      <div className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col bg-bg">
        <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <PushBanner />
        <InstallBanner />

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] z-30">
          <div className="flex justify-around px-2 pt-1.5 pb-3">
            {tabs.map((tab) => {
              const isActive =
                tab.route === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(tab.route);
              return (
                <Link
                  key={tab.route}
                  href={tab.route}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-1 transition-colors ${
                    isActive ? "text-primary" : "text-ink-3 hover:text-ink-2"
                  }`}
                >
                  <span
                    className="text-[18px] leading-none select-none"
                    aria-hidden
                  >
                    {isActive ? tab.glyphActive : tab.glyph}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] leading-none">
                    {t(tab.key)}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
