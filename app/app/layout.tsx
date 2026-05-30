"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import PushBanner from "@/components/push-banner";
import InstallBanner from "@/components/install-banner";
import ClientContextRail from "@/components/client-shell/context-rail";

const tabs = [
  { key: "home", route: "/app", glyph: "◉", hotkey: "T" },
  { key: "log", route: "/app/log", glyph: "◍", hotkey: "L" },
  { key: "workout", route: "/app/workout", glyph: "◎", hotkey: "R" },
  { key: "checkin", route: "/app/checkin", glyph: "◑", hotkey: "C" },
  { key: "profile", route: "/app/profile", glyph: "◐", hotkey: "Y" },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("app.nav");
  const [gPending, setGPending] = useState(false);

  // Client keyboard shortcuts per §12: T / L / R / C / Y + G modifier + Esc
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        if (e.key === "Escape" && e.target instanceof HTMLElement) {
          e.target.blur();
        }
        return;
      }
      const key = e.key.toUpperCase();
      if (gPending) {
        setGPending(false);
        const goto = tabs.find((tab) => tab.hotkey === key);
        if (goto) {
          e.preventDefault();
          router.push(goto.route);
          return;
        }
      }
      if (key === "G" && !e.shiftKey) {
        e.preventDefault();
        setGPending(true);
        setTimeout(() => setGPending(false), 1500);
        return;
      }
      const tab = tabs.find((tb) => tb.hotkey === key);
      if (tab) {
        e.preventDefault();
        router.push(tab.route);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, gPending]);

  const isActiveTab = (route: string) =>
    route === "/app" ? pathname === "/app" : pathname.startsWith(route);

  return (
    <div className="bg-bg min-h-screen flex">
      {/* LG+ left rail (Client desktop §19) */}
      <aside className="hidden lg:flex sticky top-0 h-screen w-[220px] shrink-0 flex-col border-r border-border bg-surface-1 px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-[7px] bg-lime text-bg font-bold text-sm">
            K
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-ink tracking-[-0.01em]">
              koach
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
              CLIENT
            </span>
          </div>
        </div>

        <nav className="mt-7 flex flex-1 flex-col gap-1">
          {tabs.map((tab) => {
            const active = isActiveTab(tab.route);
            return (
              <Link
                key={tab.route}
                href={tab.route}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-1 ${
                  active
                    ? "bg-surface-2 text-ink"
                    : "text-ink-2 hover:bg-surface-2/60 hover:text-ink"
                }`}
              >
                <span className="text-base leading-none" aria-hidden>
                  {tab.glyph}
                </span>
                <span className="flex-1">{t(tab.key)}</span>
                <span className="font-mono text-[10px] text-ink-3 px-1 py-0.5 bg-bg rounded-[3px] border border-border">
                  {tab.hotkey}
                </span>
              </Link>
            );
          })}
        </nav>
        {gPending && (
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-lime">
            G → …
          </div>
        )}
      </aside>

      {/* Center column — mobile-canonical 430 max, tablet 2-col grid, desktop centered */}
      <div className="flex-1 min-w-0 flex justify-center">
        <div
          className="w-full max-w-[430px] lg:max-w-[480px] xl:max-w-[520px] min-h-screen flex flex-col bg-bg"
        >
          <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8">
            {children}
          </main>
          <PushBanner />
          <InstallBanner />

          {/* Bottom tab bar — hidden on LG+ where the side nav takes over */}
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] border-t border-border bg-surface-1 pb-[env(safe-area-inset-bottom)] z-30 lg:hidden">
            <div className="flex justify-around px-2 pt-1.5 pb-3">
              {tabs.map((tab) => {
                const isActive = isActiveTab(tab.route);
                return (
                  <Link
                    key={tab.route}
                    href={tab.route}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={t(tab.key)}
                    className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-1 ${
                      isActive ? "text-lime" : "text-ink-3 hover:text-ink-2"
                    }`}
                  >
                    <span
                      className="text-[18px] leading-none select-none"
                      aria-hidden
                    >
                      {tab.glyph}
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

      {/* LG+ right context rail — coach note + week strip + streak. Hidden on /app/workout/log where it would distract */}
      <aside className="hidden lg:flex sticky top-0 h-screen w-[220px] shrink-0 flex-col border-l border-border bg-surface-1 px-4 py-5">
        <ClientContextRail />
      </aside>
    </div>
  );
}
