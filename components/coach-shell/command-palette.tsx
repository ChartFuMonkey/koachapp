"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Dumbbell, Apple, UtensilsCrossed, X } from "lucide-react";
import { Avatar } from "@/components/ui/athletic/avatar";
import { Kbd } from "@/components/ui/athletic/kbd";
import { MicroLabel } from "@/components/ui/athletic/micro-label";

type ClientItem = {
  id: string;
  name: string;
};

type Entry =
  | { kind: "client"; id: string; name: string }
  | { kind: "screen"; label: string; route: string; icon: typeof Users };

const SCREENS = [
  { label: "Clients", route: "/coach", icon: Users },
  { label: "Exercises", route: "/coach/exercises", icon: Dumbbell },
  { label: "Foods", route: "/coach/foods", icon: Apple },
  { label: "Meals", route: "/coach/meals", icon: UtensilsCrossed },
] as const;

function fuzzyScore(query: string, target: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 10 - (t.indexOf(q) / 100);
  let qi = 0;
  let matched = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      matched++;
      qi++;
    }
  }
  if (qi !== q.length) return 0;
  return matched / target.length;
}

export function CommandPalette({ clients }: { clients: ClientItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle on ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus input when opened, reset query
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const entries: Entry[] = useMemo(() => {
    const all: Entry[] = [
      ...clients.map((c) => ({
        kind: "client" as const,
        id: c.id,
        name: c.name,
      })),
      ...SCREENS.map((s) => ({
        kind: "screen" as const,
        label: s.label,
        route: s.route,
        icon: s.icon,
      })),
    ];
    if (!query) return all;
    return all
      .map((e) => ({
        e,
        score: fuzzyScore(query, e.kind === "client" ? e.name : e.label),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.e);
  }, [clients, query]);

  // Reset active index when entries change
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  function commit(entry: Entry) {
    setOpen(false);
    if (entry.kind === "client") {
      router.push(`/coach/clients/${entry.id}`);
    } else {
      router.push(entry.route);
    }
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, entries.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = entries[activeIdx];
      if (target) commit(target);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 bg-bg/80 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={16} className="shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Jump to client or screen…"
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
          />
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {entries.length === 0 ? (
            <p className="px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
              No matches
            </p>
          ) : (
            <ul>
              {entries.map((e, i) => {
                const isActive = i === activeIdx;
                if (e.kind === "client") {
                  return (
                    <li key={`c-${e.id}`}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIdx(i)}
                        onClick={() => commit(e)}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                          isActive ? "bg-surface-2" : ""
                        }`}
                      >
                        <Avatar name={e.name} size="xs" />
                        <span className="text-sm text-ink truncate">
                          {e.name}
                        </span>
                        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                          CLIENT
                        </span>
                      </button>
                    </li>
                  );
                }
                const Icon = e.icon;
                return (
                  <li key={`s-${e.route}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => commit(e)}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                        isActive ? "bg-surface-2" : ""
                      }`}
                    >
                      <Icon size={14} className="text-ink-2" />
                      <span className="text-sm text-ink">{e.label}</span>
                      <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                        SCREEN
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <MicroLabel>Navigate</MicroLabel>
          <div className="flex items-center gap-2 font-mono text-[10px] text-ink-3">
            <Kbd>↑↓</Kbd>
            <span>move</span>
            <Kbd>↵</Kbd>
            <span>open</span>
            <Kbd>esc</Kbd>
            <span>close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
