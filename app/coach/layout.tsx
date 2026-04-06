"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, Dumbbell, LogOut, Menu, X } from "lucide-react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile header bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center border-b border-gray-800 bg-gray-950 px-4 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <Menu size={20} />
        </button>
        <span className="ml-3 text-lg font-bold text-white">KoachApp</span>
      </div>

      {/* Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-gray-800 bg-gray-950 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between p-6">
          <h1 className="text-xl font-bold text-white">KoachApp</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-gray-400 hover:text-white md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
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

        <div className="shrink-0 border-t border-gray-800 p-6">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 text-gray-400 transition-colors hover:text-white"
          >
            <LogOut size={20} />
            <span>Odjava</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 pt-14 md:ml-64 md:pt-0">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
