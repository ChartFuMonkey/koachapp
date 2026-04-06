"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, Dumbbell, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { label: "Clients", icon: Users, route: "/coach" },
  { label: "Exercises", icon: Dumbbell, route: "/coach/exercises" },
];

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-gray-800 bg-gray-950">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">KoachApp</h1>
        </div>

        <nav className="flex flex-col gap-1">
          {navLinks.map((link) => {
            const isActive =
              link.route === "/coach"
                ? pathname === "/coach"
                : pathname.startsWith(link.route);
            const Icon = link.icon;

            return (
              <Link
                key={link.route}
                href={link.route}
                className={`mx-3 flex items-center gap-3 rounded-lg px-6 py-3 transition-colors ${
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-900 hover:text-white"
                }`}
              >
                <Icon size={20} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-6">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 text-gray-400 transition-colors hover:text-white"
          >
            <LogOut size={20} />
            <span>Odjava</span>
          </button>
        </div>
      </aside>

      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}
