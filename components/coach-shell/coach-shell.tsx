"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Kbd } from "@/components/ui/athletic/kbd";
import { LiveTimestamp } from "./live-timestamp";
import { CommandPalette } from "./command-palette";

interface NavLink {
  labelKey: "clients" | "exercises" | "foods" | "meals";
  route: string;
  hotkey: string;
}

interface ClientItem {
  id: string;
  name: string;
}

const navLinks: NavLink[] = [
  { labelKey: "clients", route: "/coach", hotkey: "C" },
  { labelKey: "exercises", route: "/coach/exercises", hotkey: "E" },
  { labelKey: "foods", route: "/coach/foods", hotkey: "F" },
  { labelKey: "meals", route: "/coach/meals", hotkey: "M" },
];

function buildBreadcrumb(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "workspace";
  return "workspace / " + parts.join(" / ");
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
  const [railExpanded, setRailExpanded] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
    setRailExpanded(false);
  }, [pathname]);

  // Coach keyboard shortcuts per §12: C / E / F / M (P, A reserved), ⌘K, G→T, N, /, Esc
  const [gPending, setGPending] = useState(false);
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
        // Allow Esc through to blur active control even in inputs
        if (e.key === "Escape" && e.target instanceof HTMLElement) {
          e.target.blur();
        }
        return;
      }
      const key = e.key.toUpperCase();
      if (gPending) {
        setGPending(false);
        if (key === "T") {
          e.preventDefault();
          router.push("/coach");
          return;
        }
      }
      if (key === "G" && !e.shiftKey) {
        e.preventDefault();
        setGPending(true);
        setTimeout(() => setGPending(false), 1500);
        return;
      }
      if (key === "/") {
        const search = document.querySelector<HTMLInputElement>(
          'input[type="text"][placeholder*="earch" i], input[type="search"]'
        );
        if (search) {
          e.preventDefault();
          search.focus();
        }
        return;
      }
      if (key === "N" && !e.shiftKey) {
        if (pathname.startsWith("/coach")) {
          // Context-sensitive new
          if (pathname === "/coach" || pathname.startsWith("/coach/clients")) {
            e.preventDefault();
            router.push("/coach/clients/new");
            return;
          }
        }
      }
      const link = navLinks.find((l) => l.hotkey === key);
      if (link) {
        e.preventDefault();
        router.push(link.route);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, pathname, gPending]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const showRail = !railExpanded;

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Mobile/tablet header for SM and below */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-11 items-center border-b border-border bg-surface-1 px-4 md:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label={t("openMenu")}
          className="rounded-sm p-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-1"
        >
          <Menu size={18} />
        </button>
        <span className="ml-3 font-semibold text-ink text-sm">{t("brand")}</span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
          COACH
        </span>
      </div>

      {/* Drawer overlay (XS/SM) */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* MD breakpoint: 72px icon rail. Expanded on hover/tap to show labels overlay. */}
      <aside
        className={`hidden md:flex lg:hidden fixed left-0 top-0 z-30 h-screen ${
          railExpanded ? "w-60" : "w-[72px]"
        } flex-col border-r border-border bg-surface-1 transition-[width] duration-fast`}
        onMouseEnter={() => setRailExpanded(true)}
        onMouseLeave={() => setRailExpanded(false)}
      >
        {/* Brand block */}
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-6">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-lime text-bg font-bold text-sm">
            K
          </div>
          {railExpanded && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="text-sm font-semibold text-ink tracking-[-0.01em]">
                koach
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                v2.4 · COACH
              </span>
            </div>
          )}
        </div>

        {!railExpanded && (
          <div className="mx-auto mb-2 h-px w-6 bg-border" />
        )}

        <nav className="flex flex-1 flex-col gap-1 px-2 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive =
              link.route === "/coach"
                ? pathname === "/coach" ||
                  pathname.startsWith("/coach/clients")
                : pathname.startsWith(link.route);
            return (
              <Link
                key={link.route}
                href={link.route}
                aria-current={isActive ? "page" : undefined}
                className={`group flex h-9 items-center gap-2.5 rounded-md transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-1 ${
                  railExpanded ? "px-2.5" : "justify-center"
                } ${
                  isActive
                    ? "bg-surface-2 text-ink"
                    : "text-ink-2 hover:bg-surface-2/60 hover:text-ink"
                }`}
              >
                <span
                  className={`font-mono text-[12px] font-medium ${
                    railExpanded ? "" : "uppercase"
                  }`}
                >
                  {railExpanded ? t(link.labelKey) : link.hotkey}
                </span>
                {railExpanded && (
                  <span className="ml-auto">
                    <Kbd>{link.hotkey}</Kbd>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom user card */}
        <div className="shrink-0 px-2 py-3">
          <div
            className={`flex items-center gap-2.5 border-t border-border pt-3 ${
              railExpanded ? "px-2" : "justify-center"
            }`}
          >
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-bg font-bold text-[11px]"
              style={{
                background: "linear-gradient(135deg, #C5F73B, #3DE8A0)",
              }}
            >
              {getInitials(coachName)}
            </div>
            {railExpanded && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-ink truncate">
                    {coachName}
                  </div>
                  <div className="font-mono text-[10px] text-good">● online</div>
                </div>
                <LanguageSwitcher />
              </>
            )}
          </div>
          {railExpanded && (
            <button
              onClick={handleSignOut}
              className="mt-2 flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-1"
            >
              <span>{t("signOut")}</span>
            </button>
          )}
        </div>
      </aside>

      {/* XS/SM drawer + LG sidebar = 240px */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-border bg-surface-1 transition-transform duration-200 md:hidden lg:flex ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Brand block */}
        <div className="flex items-center justify-between px-4 pt-5 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-[7px] bg-lime text-bg font-bold text-sm">
              K
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-ink tracking-[-0.01em]">
                koach
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                v2.4 · COACH
              </span>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label={t("closeMenu")}
            className="rounded-sm p-1 text-ink-3 hover:text-ink lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-1"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 pb-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
          WORKSPACE
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive =
              link.route === "/coach"
                ? pathname === "/coach" ||
                  pathname.startsWith("/coach/clients")
                : pathname.startsWith(link.route);
            return (
              <Link
                key={link.route}
                href={link.route}
                aria-current={isActive ? "page" : undefined}
                className={`group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-1 ${
                  isActive
                    ? "bg-surface-2 text-ink"
                    : "text-ink-2 hover:bg-surface-2/60 hover:text-ink"
                }`}
              >
                <span className="flex-1">{t(link.labelKey)}</span>
                <Kbd>{link.hotkey}</Kbd>
              </Link>
            );
          })}
        </nav>

        {/* Bottom user card */}
        <div className="shrink-0 px-2 py-3">
          <div className="flex items-center gap-2.5 border-t border-border pt-3 px-2">
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
            className="mt-2 flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-1"
          >
            <span>{t("signOut")}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col pt-11 md:pt-0 md:ml-[72px] lg:ml-60">
        {/* Top bar — 44px, breadcrumb left, status+time right */}
        <div className="hidden h-11 items-center justify-between border-b border-border bg-surface-1 px-6 lg:px-8 md:flex">
          <span className="font-mono text-[11px] text-ink-3 lowercase">
            {buildBreadcrumb(pathname)}
          </span>
          <div className="flex items-center gap-3">
            {gPending && (
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-lime">
                G →
              </span>
            )}
            <LiveTimestamp className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3" />
            <span className="size-1.5 rounded-full bg-good shadow-[0_0_8px_rgba(61,232,160,0.5)]" />
          </div>
        </div>
        <main className="flex-1 overflow-x-auto">{children}</main>
      </div>
      <CommandPalette clients={clients} />
    </div>
  );
}
