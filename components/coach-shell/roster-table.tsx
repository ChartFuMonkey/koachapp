"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/athletic/avatar";
import { Chip } from "@/components/ui/athletic/chip";
import { StatusDot } from "@/components/ui/athletic/status-dot";
import { useClientUnreadCount } from "@/components/coach-shell/coach-unread-context";

export type RosterRow = {
  id: string;
  name: string;
  phaseName: string;
  /** normalized phase bucket: "cut" | "bulk" | "recomp" | "maint" | "" */
  phaseKind: string;
  lastAgo: string;
  lastLogDate: string | null;
  lastWeight: number | null;
  weekDelta: number | null;
  deltaColor: string;
  deltaText: string;
  adherencePct: number;
  avgRpe: number | null;
  weekLogs: number;
  tone: "good" | "warn" | "danger";
};

type FilterId =
  | "all"
  | "ontrack"
  | "attention"
  | "overdue"
  | "cut"
  | "bulk"
  | "recomp";

type SortId = "last" | "adherence" | "name" | "delta";

export type RosterLabels = {
  client: string;
  phase: string;
  last: string;
  weight: string;
  delta: string;
  adherence: string;
  rpe: string;
  sort: string;
  filters: Record<FilterId, string>;
  sorts: Record<SortId, string>;
};

function ClientNameCell({ id, name }: { id: string; name: string }) {
  const unread = useClientUnreadCount(id);
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar name={name} size="sm" />
      <span className="font-medium text-[13px] text-ink truncate">{name}</span>
      {unread > 0 && (
        <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-lime px-1.5 text-[10px] font-bold text-bg">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </div>
  );
}

function matchesFilter(row: RosterRow, filter: FilterId): boolean {
  switch (filter) {
    case "all":
      return true;
    case "ontrack":
      return row.weekLogs >= 4;
    case "attention":
      return row.weekLogs >= 1 && row.weekLogs <= 3;
    case "overdue":
      return row.weekLogs === 0;
    case "cut":
      return row.phaseKind === "cut";
    case "bulk":
      return row.phaseKind === "bulk";
    case "recomp":
      return row.phaseKind === "recomp";
    default:
      return true;
  }
}

function sortRows(rows: RosterRow[], sort: SortId): RosterRow[] {
  const copy = [...rows];
  switch (sort) {
    case "last":
      // Most recent log first; never-logged sinks to the bottom.
      return copy.sort((a, b) =>
        (b.lastLogDate ?? "").localeCompare(a.lastLogDate ?? "")
      );
    case "adherence":
      return copy.sort((a, b) => b.adherencePct - a.adherencePct);
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "delta":
      return copy.sort(
        (a, b) => Math.abs(b.weekDelta ?? 0) - Math.abs(a.weekDelta ?? 0)
      );
    default:
      return copy;
  }
}

const SORT_CYCLE: SortId[] = ["last", "adherence", "name", "delta"];
const SORT_ARROW: Record<SortId, string> = {
  last: "↓",
  adherence: "↓",
  name: "↑",
  delta: "↓",
};

export function RosterTable({
  rows,
  labels,
}: {
  rows: RosterRow[];
  labels: RosterLabels;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("last");

  // Only show phase chips for phases that actually exist in the roster.
  const phaseChips: FilterId[] = (["cut", "bulk", "recomp"] as const).filter(
    (k) => rows.some((r) => r.phaseKind === k)
  );
  const chipOrder: FilterId[] = [
    "all",
    "ontrack",
    "attention",
    "overdue",
    ...phaseChips,
  ];

  const counts: Record<FilterId, number> = {
    all: rows.length,
    ontrack: rows.filter((r) => r.weekLogs >= 4).length,
    attention: rows.filter((r) => r.weekLogs >= 1 && r.weekLogs <= 3).length,
    overdue: rows.filter((r) => r.weekLogs === 0).length,
    cut: rows.filter((r) => r.phaseKind === "cut").length,
    bulk: rows.filter((r) => r.phaseKind === "bulk").length,
    recomp: rows.filter((r) => r.phaseKind === "recomp").length,
  };

  const visible = sortRows(rows.filter((r) => matchesFilter(r, filter)), sort);

  return (
    <>
      {/* Filter chips + sort */}
      <div className="mt-7 flex flex-wrap items-center gap-1.5">
        {chipOrder.map((id) => {
          const active = filter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={active}
              className={`px-1.5 py-[3px] rounded-[3px] font-mono text-[10px] uppercase tracking-[0.06em] border transition-colors ${
                active
                  ? "bg-ink text-bg border-ink"
                  : "bg-surface-1 text-ink-2 border-border hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {labels.filters[id]} · {counts[id]}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() =>
            setSort(
              (prev) =>
                SORT_CYCLE[(SORT_CYCLE.indexOf(prev) + 1) % SORT_CYCLE.length]
            )
          }
          className="ml-auto font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3 hover:text-ink transition-colors"
        >
          {labels.sort}: {labels.sorts[sort]} {SORT_ARROW[sort]}
        </button>
      </div>

      {/* Roster table — desktop. Per §15: >6-col tables show 4 priority cols at MD. */}
      <div className="mt-4 hidden sm:block overflow-hidden rounded-lg border border-border bg-surface-1">
        <div className="grid grid-cols-[2fr_1fr_1fr_0.4fr] lg:grid-cols-[2fr_1fr_0.6fr_0.7fr_0.6fr_1fr_0.6fr_0.4fr] items-center gap-2 px-5 py-3 border-b border-border font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
          <span>{labels.client}</span>
          <span>{labels.phase}</span>
          <span className="hidden lg:inline">{labels.last}</span>
          <span className="hidden lg:inline">{labels.weight}</span>
          <span className="hidden lg:inline">{labels.delta}</span>
          <span>{labels.adherence}</span>
          <span className="hidden lg:inline">{labels.rpe}</span>
          <span />
        </div>

        {visible.map((c, idx) => {
          const barColor =
            c.tone === "good"
              ? "var(--good)"
              : c.tone === "warn"
                ? "var(--warn)"
                : "var(--danger)";
          return (
            <Link
              key={c.id}
              href={`/coach/clients/${c.id}`}
              className={`block transition-colors hover:bg-surface-2/40 ${
                idx < visible.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="grid grid-cols-[2fr_1fr_1fr_0.4fr] lg:grid-cols-[2fr_1fr_0.6fr_0.7fr_0.6fr_1fr_0.6fr_0.4fr] items-center gap-2 px-5 py-3.5">
                <ClientNameCell id={c.id} name={c.name} />
                <div>
                  <Chip variant="neutral" className="w-fit">
                    {c.phaseName}
                  </Chip>
                </div>
                <span className="hidden lg:inline font-mono text-[11px] text-ink-2 tabular-nums">
                  {c.lastAgo}
                </span>
                <span className="hidden lg:inline font-mono text-[12px] text-ink tabular-nums">
                  {c.lastWeight != null ? c.lastWeight : "—"}
                </span>
                <span
                  className="hidden lg:inline font-mono text-[12px] tabular-nums"
                  style={{ color: c.deltaColor }}
                >
                  {c.deltaText}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1 max-w-[80px] flex-1 overflow-hidden rounded-full bg-hairline">
                    <div
                      className="h-full"
                      style={{
                        width: `${c.adherencePct}%`,
                        background: barColor,
                      }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-ink-2 tabular-nums">
                    {c.adherencePct}%
                  </span>
                </div>
                <span className="hidden lg:inline font-mono text-[12px] text-ink tabular-nums">
                  {c.avgRpe != null ? c.avgRpe.toFixed(1) : "—"}
                </span>
                <div className="flex items-center justify-end">
                  <StatusDot tone={c.tone} />
                </div>
              </div>
            </Link>
          );
        })}

        {visible.length === 0 && (
          <div className="px-5 py-8 text-center font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
            —
          </div>
        )}
      </div>
    </>
  );
}
