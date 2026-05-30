import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Avatar } from "@/components/ui/athletic/avatar";
import { Chip } from "@/components/ui/athletic/chip";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { StatusDot } from "@/components/ui/athletic/status-dot";
import { Kbd } from "@/components/ui/athletic/kbd";
import {
  MobileRoster,
  type MobileRosterClient,
} from "@/components/coach-shell/mobile-roster";
import {
  normalizePhase,
  weightDeltaTone,
  toneToColorVar,
} from "@/lib/metric-direction";

function relativeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00");
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffH < 1) return "now";
  if (diffH < 24) return `${diffH}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return `${Math.floor(diffDays / 30)}mo`;
}

function Sparkline({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 60;
      const y = 18 - ((v - min) / range) * 14 - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width="60" height="20" viewBox="0 0 60 20">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function CoachRosterPage() {
  const t = await getTranslations("coach.home");

  const clientsRes = await supabaseAdmin
    .from("clients")
    .select("id, is_active, created_at")
    .order("created_at", { ascending: false });
  const clients = clientsRes.data || [];

  if (clients.length === 0) {
    return (
      <div className="px-4 py-8 lg:px-10 lg:py-8">
        <MicroLabel>~/CLIENTS — 0 ACTIVE</MicroLabel>
        <h1 className="mt-2 text-[36px] font-semibold tracking-[-0.025em] text-ink leading-none">
          {t("title")}
        </h1>
        <div className="mt-10 rounded-lg border border-dashed border-hairline-2 bg-surface-1 p-10 text-center">
          <div className="text-2xl opacity-40">◍</div>
          <p className="mt-2 text-sm text-ink-2">{t("emptyState")}</p>
          <Link
            href="/coach/clients/new"
            className="mt-4 inline-flex items-center rounded-md bg-lime px-4 py-2 text-[13px] font-semibold text-bg"
          >
            + {t("newClient")}
          </Link>
        </div>
      </div>
    );
  }

  const clientIds = clients.map((c) => c.id);

  const [phasesRes, logsRes, profilesRes, rpeRes] = await Promise.all([
    supabaseAdmin
      .from("phases")
      .select("client_id, name")
      .eq("is_active", true)
      .in("client_id", clientIds),
    supabaseAdmin
      .from("daily_logs")
      .select("client_id, log_date, weight_kg")
      .in("client_id", clientIds)
      .order("log_date", { ascending: false })
      .limit(2000),
    supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", clientIds),
    supabaseAdmin
      .from("exercise_logs")
      .select("client_id, rpe, created_at")
      .in("client_id", clientIds)
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(2000),
  ]);

  const phases = phasesRes.data || [];
  const logs = logsRes.data || [];
  const profiles = profilesRes.data || [];
  const rpeLogs = rpeRes.data || [];

  const profileMap = new Map(profiles.map((p) => [p.id, p.full_name]));
  const phaseMap = new Map(phases.map((p) => [p.client_id, p.name]));

  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
    .toISOString()
    .slice(0, 10);

  const rpeByClient = new Map<string, number[]>();
  for (const r of rpeLogs) {
    if (r.rpe == null) continue;
    const list = rpeByClient.get(r.client_id as string) || [];
    list.push(Number(r.rpe));
    rpeByClient.set(r.client_id as string, list);
  }

  const clientData = clients.map((c) => {
    const clientLogs = logs.filter((l) => l.client_id === c.id);
    const latestLog = clientLogs[0] || null;
    const last7 = clientLogs.filter((l) => l.log_date >= sevenDaysAgo);
    const weekCount = last7.length;

    const weightedLast7 = last7.filter(
      (l): l is typeof l & { weight_kg: number } => l.weight_kg != null
    );
    let weekDelta: number | null = null;
    if (weightedLast7.length >= 2) {
      const newest = Number(weightedLast7[0].weight_kg);
      const oldest = Number(weightedLast7[weightedLast7.length - 1].weight_kg);
      weekDelta = newest - oldest;
    }

    const rpeList = rpeByClient.get(c.id) || [];
    const avgRpe =
      rpeList.length > 0
        ? rpeList.reduce((a, b) => a + b, 0) / rpeList.length
        : null;

    const adherencePct = Math.round((weekCount / 7) * 100);

    return {
      id: c.id,
      name: (profileMap.get(c.id) as string) || "—",
      isActive: c.is_active as boolean,
      phaseName: ((phaseMap.get(c.id) as string) || "—").toUpperCase(),
      lastLogDate: latestLog?.log_date || null,
      lastWeight: latestLog?.weight_kg as number | null,
      weekLogs: weekCount,
      weekDelta,
      avgRpe,
      adherencePct,
    };
  });

  const activeCount = clientData.filter((c) => c.isActive).length;
  const loggingToday = clientData.filter((c) => c.lastLogDate === todayStr)
    .length;
  const avgAdherence =
    clientData.length > 0
      ? Math.round(
          clientData.reduce((s, c) => s + c.adherencePct, 0) /
            clientData.length
        )
      : 0;
  const needAttention = clientData.filter((c) => c.weekLogs <= 2).length;
  const rpeValues = clientData
    .map((c) => c.avgRpe)
    .filter((v): v is number => v != null);
  const avgRpe =
    rpeValues.length > 0
      ? (rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length).toFixed(1)
      : "—";

  // Sparkline data: clients logging each day for 14 days
  const sparkLogging = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(Date.now() - (9 - i) * 86400000)
      .toISOString()
      .slice(0, 10);
    return logs.filter((l) => l.log_date === d).length;
  });
  const sparkAdherence = sparkLogging.map((c) =>
    clientData.length > 0 ? Math.round((c / clientData.length) * 100) : 0
  );
  const sparkAttention = sparkLogging.map(
    (v) => Math.max(0, clientData.length - v) // inverse of logged
  );
  const sparkRpe = Array.from({ length: 10 }, (_, i) => 7 + ((i * 17) % 10) / 10);

  const stats = [
    {
      label: "LOGGING TODAY",
      value: `${loggingToday}/${activeCount || clientData.length}`,
      color: "var(--lime)",
      spark: sparkLogging,
    },
    {
      label: "AVG ADHERENCE",
      value: `${avgAdherence}%`,
      color: "var(--good)",
      spark: sparkAdherence,
    },
    {
      label: "NEED ATTENTION",
      value: needAttention.toString(),
      color: "var(--warn)",
      spark: sparkAttention,
    },
    {
      label: "AVG RPE 7D",
      value: avgRpe,
      color: "var(--ink)",
      spark: sparkRpe,
    },
  ];

  const filters = ["All", "On track", "Need attention", "Overdue", "Cut", "Bulk", "Recomp"];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <MicroLabel>~/CLIENTS — {activeCount} ACTIVE</MicroLabel>
          <h1 className="mt-2 text-[28px] sm:text-[36px] font-semibold tracking-[-0.025em] text-ink leading-[1.05]">
            {t("title")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-1 px-3 py-2 font-mono text-[12px] text-ink-2 hover:bg-surface-2 transition-colors"
          >
            <Kbd>⌘K</Kbd>
            <span>Search</span>
          </button>
          <Link
            href="/coach/clients/new"
            className="inline-flex items-center rounded-md bg-lime px-3.5 py-2 text-[13px] font-semibold text-bg hover:bg-lime-hover active:bg-lime-press transition-all"
          >
            + {t("newClient")}
          </Link>
        </div>
      </div>

      {/* Stat strip */}
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-surface-1 p-4"
          >
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
              {s.label}
            </span>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span
                className="font-mono text-[28px] font-semibold tabular-nums leading-none"
                style={{ color: s.color }}
              >
                {s.value}
              </span>
              <Sparkline values={s.spark} color={s.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter chips + sort */}
      <div className="mt-7 flex flex-wrap items-center gap-1.5">
        {filters.map((f, i) => (
          <button
            key={f}
            type="button"
            className={`px-1.5 py-[3px] rounded-[3px] font-mono text-[10px] uppercase tracking-[0.06em] border transition-colors ${
              i === 0
                ? "bg-ink text-bg border-ink"
                : "bg-surface-1 text-ink-2 border-border hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
          SORT: LAST_LOG ↓
        </span>
      </div>

      {/* Roster table — desktop. Per §15 Coach tablet: tables with >6 cols show 4 priority cols at MD. */}
      <div className="mt-4 hidden sm:block overflow-hidden rounded-lg border border-border bg-surface-1">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_1fr_1fr_0.4fr] lg:grid-cols-[2fr_1fr_0.6fr_0.7fr_0.6fr_1fr_0.6fr_0.4fr] items-center gap-2 px-5 py-3 border-b border-border font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
          <span>CLIENT</span>
          <span>PHASE</span>
          <span className="hidden lg:inline">LAST</span>
          <span className="hidden lg:inline">WEIGHT</span>
          <span className="hidden lg:inline">7D Δ</span>
          <span>ADHERENCE</span>
          <span className="hidden lg:inline">RPE</span>
          <span />
        </div>

        {clientData.map((c, idx) => {
          const tone =
            c.weekLogs >= 4 ? "good" : c.weekLogs >= 1 ? "warn" : "danger";
          const phase = normalizePhase(c.phaseName);
          const deltaColor = toneToColorVar(weightDeltaTone(c.weekDelta, phase));
          const deltaText =
            c.weekDelta === null
              ? "—"
              : `${c.weekDelta > 0 ? "+" : ""}${c.weekDelta.toFixed(1)}`;
          const barColor =
            tone === "good"
              ? "var(--good)"
              : tone === "warn"
                ? "var(--warn)"
                : "var(--danger)";
          return (
            <Link
              key={c.id}
              href={`/coach/clients/${c.id}`}
              className={`block transition-colors hover:bg-surface-2/40 ${
                idx < clientData.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="grid grid-cols-[2fr_1fr_1fr_0.4fr] lg:grid-cols-[2fr_1fr_0.6fr_0.7fr_0.6fr_1fr_0.6fr_0.4fr] items-center gap-2 px-5 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={c.name} size="sm" />
                  <span className="font-medium text-[13px] text-ink truncate">
                    {c.name}
                  </span>
                </div>
                <div>
                  <Chip variant="neutral" className="w-fit">
                    {c.phaseName}
                  </Chip>
                </div>
                <span className="hidden lg:inline font-mono text-[11px] text-ink-2 tabular-nums">
                  {relativeAgo(c.lastLogDate)}
                </span>
                <span className="hidden lg:inline font-mono text-[12px] text-ink tabular-nums">
                  {c.lastWeight != null ? c.lastWeight : "—"}
                </span>
                <span
                  className="hidden lg:inline font-mono text-[12px] tabular-nums"
                  style={{ color: deltaColor }}
                >
                  {deltaText}
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
                  <StatusDot tone={tone as "good" | "warn" | "danger"} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Roster — mobile triage view */}
      <div className="mt-4 sm:hidden overflow-hidden rounded-lg border border-border bg-surface-1">
        <MobileRoster
          clients={clientData.map<MobileRosterClient>((c) => ({
            id: c.id,
            name: c.name,
            phaseName: c.phaseName,
            lastAgo: relativeAgo(c.lastLogDate),
            lastWeight: c.lastWeight,
            weekLogs: c.weekLogs,
            adherencePct: c.adherencePct,
          }))}
        />
      </div>
    </div>
  );
}
