"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Home,
  ClipboardList,
  Dumbbell,
  CheckSquare,
  Camera,
  User,
} from "lucide-react";
import PushBanner from "@/components/push-banner";
import InstallBanner from "@/components/install-banner";

const tabs = [
  { key: "home", icon: Home, route: "/app" },
  { key: "log", icon: ClipboardList, route: "/app/log" },
  { key: "workout", icon: Dumbbell, route: "/app/workout" },
  { key: "checkin", icon: CheckSquare, route: "/app/checkin" },
  { key: "photos", icon: Camera, route: "/app/photos" },
  { key: "profile", icon: User, route: "/app/profile" },
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
          <div className="flex justify-around px-2 pt-1.5 pb-1.5">
            {tabs.map((tab) => {
              const isActive =
                tab.route === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(tab.route);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.route}
                  href={tab.route}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-1 transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-ink-3 hover:text-ink-2"
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
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
