"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/athletic/avatar";
import { StatusDot } from "@/components/ui/athletic/status-dot";

export type MobileRosterClient = {
  id: string;
  name: string;
  phaseName: string;
  lastAgo: string;
  lastWeight: number | null;
  weekLogs: number;
  adherencePct: number;
};

type Filter = "ALL" | "ATTENTION" | "OVERDUE";

function toneFor(weekLogs: number): "good" | "warn" | "danger" {
  if (weekLogs >= 4) return "good";
  if (weekLogs >= 1) return "warn";
  return "danger";
}

export function MobileRoster({ clients }: { clients: MobileRosterClient[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const attentionCount = clients.filter(
    (c) => c.weekLogs >= 1 && c.weekLogs <= 3
  ).length;
  const overdueCount = clients.filter((c) => c.weekLogs === 0).length;

  const filtered = clients.filter((c) => {
    if (filter === "ALL") return true;
    if (filter === "ATTENTION") return c.weekLogs >= 1 && c.weekLogs <= 3;
    if (filter === "OVERDUE") return c.weekLogs === 0;
    return true;
  });

  const chips: { id: Filter; label: string; count: number }[] = [
    { id: "ALL", label: "ALL", count: clients.length },
    { id: "ATTENTION", label: "ATTENTION", count: attentionCount },
    { id: "OVERDUE", label: "OVERDUE", count: overdueCount },
  ];

  return (
    <div className="sm:hidden">
      {/* Triage chip row */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-3">
        {chips.map((c) => {
          const active = filter === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={`px-1.5 py-[3px] rounded-[3px] font-mono text-[10px] uppercase tracking-[0.06em] border transition-colors ${
                active
                  ? "bg-ink text-bg border-ink"
                  : "bg-surface-2 text-ink-2 border-border hover:text-ink"
              }`}
            >
              {c.label} · {c.count}
            </button>
          );
        })}
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-1.5 p-2">
        {filtered.map((c) => {
          const tone = toneFor(c.weekLogs);
          const borderClass =
            tone === "warn"
              ? "border-warn/30"
              : tone === "danger"
                ? "border-danger/30"
                : "border-border";
          const microClass =
            tone === "warn"
              ? "text-warn"
              : tone === "danger"
                ? "text-danger"
                : "text-ink-3";
          return (
            <Link
              key={c.id}
              href={`/coach/clients/${c.id}`}
              className={`flex items-center gap-3 rounded-lg border bg-surface-1 px-3.5 py-3 transition-colors hover:bg-surface-2/40 ${borderClass}`}
            >
              <Avatar name={c.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-ink truncate">
                    {c.name}
                  </span>
                </div>
                <div
                  className={`mt-0.5 flex items-center gap-2 font-mono text-[10px] ${microClass}`}
                >
                  <span>{c.phaseName}</span>
                  <span>·</span>
                  <span>{c.lastAgo}</span>
                  <span>·</span>
                  <span>{c.adherencePct}%</span>
                </div>
              </div>
              <StatusDot tone={tone} size="sm" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
