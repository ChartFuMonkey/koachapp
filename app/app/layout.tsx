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
    <>
      <main className="pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</main>
      <PushBanner />
      <InstallBanner />

      <nav
        className="fixed bottom-0 w-full border-t border-gray-800 bg-gray-950 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex justify-around">
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
                className={`flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 px-2 py-1 ${
                  isActive ? "text-blue-500" : "text-gray-500"
                }`}
              >
                <Icon size={20} />
                <span className="text-xs">{t(tab.key)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
