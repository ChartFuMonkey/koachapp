"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  Dumbbell,
  CheckSquare,
  User,
} from "lucide-react";

const tabs = [
  { label: "Danas", icon: Home, route: "/app" },
  { label: "Dnevnik", icon: ClipboardList, route: "/app/log" },
  { label: "Trening", icon: Dumbbell, route: "/app/workout" },
  { label: "Prijava", icon: CheckSquare, route: "/app/checkin" },
  { label: "Profil", icon: User, route: "/app/profile" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <main className="pb-20">{children}</main>

      <nav
        className="fixed bottom-0 w-full border-t border-gray-800 bg-gray-950"
        style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
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
                className={`flex min-h-[48px] flex-col items-center justify-center gap-1 px-2 py-1 ${
                  isActive ? "text-blue-500" : "text-gray-500"
                }`}
              >
                <Icon size={20} />
                <span className="text-xs">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
