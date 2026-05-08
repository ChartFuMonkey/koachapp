"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Users,
  Dumbbell,
  LogOut,
  Menu,
  X,
  Apple,
  UtensilsCrossed,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { Kbd } from "@/components/ui/athletic/kbd";
import { LiveTimestamp } from "./live-timestamp";
import { CommandPalette } from "./command-palette";

interface NavLink {
  labelKey: "clients" | "exercises" | "foods" | "meals";
  icon: typeof Users;
  route: string;
  hotkey: string;
}

interface ClientItem {
  id: string;
  name: string;
}

const navLinks: NavLink[] = [
  { labelKey: "clients", icon: Users, route: "/coach", hotkey: "C" },
  { labelKey: "exercises", icon: Dumbbell, route: "/coach/exercises", hotkey: "E" },
  { labelKey: "foods", icon: Apple, route: "/coach/foods", hotkey: "F" },
  { labelKey: "meals", icon: UtensilsCrossed, route: "/coach/meals", hotkey: "M" },
];

function buildBreadcrumb(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "~";
  return "~/" + parts.join(" / ");
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CoachShell({
  children,
  clients = [],
  coachName = "Coach",
}: {
  children: React.ReactNode;
  clients?: ClientItem[];
  coachName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("coach.nav");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Hotkeys for navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.shiftKey ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      const key = e.key.toUpperCase();
      const link = navLinks.find((l) => l.hotkey === key);
      if (link) {
        e.preventDefault();
        router.push(link.route);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Mobile/tablet header */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-12 items-center border-b border-border bg-surface px-4 lg:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label={t("openMenu")}
          className="rounded-md p-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <Menu size={18} />
        </button>
        <span className="ml-3 font-semibold text-ink">{t("brand")}</span>
      </div>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-border bg-surface transition-transform duration-200 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-7 items-center justify-center rounded-md text-bg font-bold text-sm"
              style={{ background: "var(--lime)" }}
            >
              K
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-ink tracking-tight">
                koach
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                v0.1 · COACH
              </span>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label={t("closeMenu")}
            className="rounded-md p-1 text-ink-3 hover:text-ink lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-2">
          <MicroLabel>~/Workspace</MicroLabel>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive =
              link.route === "/coach"
                ? pathname === "/coach" ||
                  pathname.startsWith("/coach/clients")
                : pathname.startsWith(link.route);
            const Icon = link.icon;
            return (
              <Link
                key={link.route}
                href={link.route}
                className={`group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-surface-2 text-ink"
                    : "text-ink-2 hover:bg-surface-2/60 hover:text-ink"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="flex-1">{t(link.labelKey)}</span>
                <Kbd>{link.hotkey}</Kbd>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border px-3 py-3">
          <div className="flex items-center gap-2.5 px-2">
            <div
              className="flex size-8 items-center justify-center rounded-full text-bg font-bold text-[11px]"
              style={{
                background: "linear-gradient(135deg, #C5F73B, #3DE8A0)",
              }}
            >
              {getInitials(coachName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-ink truncate">
                {coachName}
              </div>
              <div className="font-mono text-[10px] text-good">● online</div>
            </div>
            <LanguageSwitcher />
          </div>
          <button
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <LogOut size={13} />
            <span>{t("signOut")}</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col pt-12 lg:ml-60 lg:pt-0">
        {/* Top bar */}
        <div className="hidden h-11 items-center justify-between border-b border-border bg-surface px-8 lg:flex">
          <span className="font-mono text-[11px] text-ink-3 lowercase">
            {buildBreadcrumb(pathname)}
          </span>
          <div className="flex items-center gap-3">
            <span className="size-1.5 rounded-full bg-good shadow-[0_0_8px_rgba(61,232,160,0.4)]" />
            <LiveTimestamp className="font-mono text-[11px] text-ink-3" />
          </div>
        </div>
        <main className="flex-1 overflow-x-auto">
          <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
        </main>
      </div>
      <CommandPalette clients={clients} />
    </div>
  );
}
