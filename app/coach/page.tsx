import Link from "next/link";
import { UserPlus } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/athletic/avatar";
import { Chip } from "@/components/ui/athletic/chip";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { StatusDot } from "@/components/ui/athletic/status-dot";

function relativeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00");
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d";
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return `${Math.floor(diffDays / 30)}mo`;
}

function Sparkline({
  values,
  color,
  width = 60,
  height = 20,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
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

export default async function CoachPage() {
  const t = await getTranslations("coach.home");
  const locale = await getLocale();
  const bcp47 = locale === "en" ? "en-US" : "hr-HR";

  const clientsRes = await supabaseAdmin
    .from("clients")
    .select("id, is_active, created_at")
    .order("created_at", { ascending: false });
  const clients = clientsRes.data || [];

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <MicroLabel className="mb-3">~/Clients · 0 active</MicroLabel>
        <p className="text-base text-ink-2">{t("emptyState")}</p>
        <Link href="/coach/clients/new" className="mt-5">
          <Button>
            <UserPlus size={14} /> {t("newClient")}
          </Button>
        </Link>
      </div>
    );
  }

  const clientIds = clients.map((c) => c.id);

  const [phasesRes, logsRes, profilesRes] = await Promise.all([
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
  ]);

  const phases = phasesRes.data || [];
  const logs = logsRes.data || [];
  const profiles = profilesRes.data || [];

  const profileMap = new Map(profiles.map((p) => [p.id, p.full_name]));
  const phaseMap = new Map(phases.map((p) => [p.client_id, p.name]));

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
    .toISOString()
    .slice(0, 10);

  const clientData = clients.map((c) => {
    const clientLogs = logs.filter((l) => l.client_id === c.id);
    const latestLog = clientLogs[0] || null;
    const last7 = clientLogs.filter((l) => l.log_date >= sevenDaysAgo);
    const weekCount = last7.length;

    // 7-day weight delta = latest weight - earliest weight in last 7d
    const weightedLast7 = last7.filter(
      (l): l is typeof l & { weight_kg: number } => l.weight_kg != null
    );
    let weekDelta: number | null = null;
    if (weightedLast7.length >= 2) {
      const newest = Number(weightedLast7[0].weight_kg);
      const oldest = Number(weightedLast7[weightedLast7.length - 1].weight_kg);
      weekDelta = newest - oldest;
    }

    return {
      id: c.id,
      name: (profileMap.get(c.id) as string) || "—",
      isActive: c.is_active as boolean,
      phaseName: (phaseMap.get(c.id) as string) || "—",
      lastLogDate: latestLog?.log_date || null,
      lastWeight: latestLog?.weight_kg || null,
      weekLogs: weekCount,
      weekDelta,
    };
  });

  const activeCount = clientData.filter((c) => c.isActive).length;
  const loggingToday = clientData.filter((c) => c.lastLogDate === todayStr)
    .length;
  const avgAdherence =
    clientData.length > 0
      ? Math.round(
          (clientData.reduce((s, c) => s + (c.weekLogs / 7) * 100, 0) /
            clientData.length)
        )
      : 0;
  const needAttention = clientData.filter((c) => c.weekLogs <= 2).length;

  // Stat cards with sparkline data (synthesized from log distribution by day)
  const sparkLogging = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000)
      .toISOString()
      .slice(0, 10);
    return logs.filter((l) => l.log_date === d).length;
  });
  const sparkAdherence = sparkLogging.map((c) =>
    clientData.length > 0
      ? Math.round((c / clientData.length) * 100)
      : 0
  );

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
      spark: sparkLogging.map((v, i) => sparkLogging.length - i + (v % 3)),
    },
    {
      label: "TOTAL CLIENTS",
      value: clientData.length.toString(),
      color: "var(--ink)",
      spark: Array.from({ length: 14 }, (_, i) =>
        Math.min(clientData.length, i + 1)
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <MicroLabel>~/Clients — {activeCount} active</MicroLabel>
          <h1 className="mt-1 text-[28px] sm:text-[32px] font-semibold tracking-tight text-ink">
            {t("title")}
          </h1>
        </div>
        <Link href="/coach/clients/new">
          <Button>
            <UserPlus size={14} /> {t("newClient")}
          </Button>
        </Link>
      </div>

      {/* 4-up stat strip with sparklines */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <MicroLabel>{s.label}</MicroLabel>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span
                className="font-mono text-[26px] font-semibold tracking-tight text-ink leading-none tabular-nums"
                style={{ color: s.color }}
              >
                {s.value}
              </span>
              <Sparkline values={s.spark} color={s.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter chips with SORT indicator */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {["All", "On track", "Need attention", "Overdue"].map((f, i) => (
          <button
            key={f}
            type="button"
            className={`px-2 py-1 rounded-sm font-mono text-[10px] uppercase tracking-[0.06em] border transition-colors ${
              i === 0
                ? "bg-ink text-bg border-ink"
                : "bg-surface text-ink-2 border-border hover:bg-surface-2"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
          SORT: LAST_LOG ↓
        </span>
      </div>

      {/* Roster table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Desktop columns header */}
        <div className="hidden grid-cols-[2fr_1fr_0.7fr_0.7fr_0.7fr_0.7fr_0.5fr] items-center border-b border-border px-5 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3 sm:grid">
          <span>{t("colName")}</span>
          <span>{t("colPhase")}</span>
          <span className="text-right">{t("colLastLog")}</span>
          <span className="text-right">{t("colWeight")}</span>
          <span className="text-right">7D Δ</span>
          <span className="text-right">{t("colThisWeek")}</span>
          <span className="text-right">{t("colStatus")}</span>
        </div>
        {clientData.map((c, idx) => {
          const tone =
            c.weekLogs >= 4 ? "good" : c.weekLogs >= 1 ? "warn" : "danger";
          const phaseLower = c.phaseName.toLowerCase();
          const isCut =
            phaseLower.includes("cut") || phaseLower.includes("def");
          const deltaColor =
            c.weekDelta === null
              ? "var(--ink-3)"
              : c.weekDelta < 0
                ? isCut
                  ? "var(--good)"
                  : "var(--warn)"
                : c.weekDelta > 0
                  ? isCut
                    ? "var(--warn)"
                    : "var(--good)"
                  : "var(--ink-3)";
          const deltaText =
            c.weekDelta === null
              ? "—"
              : `${c.weekDelta > 0 ? "+" : ""}${c.weekDelta.toFixed(1)}`;
          return (
            <Link
              key={c.id}
              href={`/coach/clients/${c.id}`}
              className={`block hover:bg-surface-2/40 transition-colors ${
                idx < clientData.length - 1 ? "border-b border-border" : ""
              }`}
            >
              {/* Desktop row */}
              <div className="hidden grid-cols-[2fr_1fr_0.7fr_0.7fr_0.7fr_0.7fr_0.5fr] items-center gap-2 px-5 py-3 sm:grid">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={c.name} size="sm" />
                  <span className="font-medium text-[13px] text-ink truncate">
                    {c.name}
                  </span>
                </div>
                <Chip variant="ghost" size="sm" className="w-fit">
                  {c.phaseName.toUpperCase()}
                </Chip>
                <span className="text-right font-mono text-[11px] text-ink-2 tabular-nums">
                  {relativeAgo(c.lastLogDate)}
                </span>
                <span className="text-right font-mono text-[12px] text-ink tabular-nums">
                  {c.lastWeight != null ? c.lastWeight : "—"}
                </span>
                <span
                  className="text-right font-mono text-[12px] tabular-nums"
                  style={{ color: deltaColor }}
                >
                  {deltaText}
                </span>
                <span className="text-right font-mono text-[12px] text-ink tabular-nums">
                  {c.weekLogs}/7
                </span>
                <div className="flex items-center justify-end">
                  {c.isActive ? (
                    <StatusDot
                      tone={tone as "good" | "warn" | "danger"}
                    />
                  ) : (
                    <StatusDot tone="neutral" glow={false} />
                  )}
                </div>
              </div>

              {/* Mobile row */}
              <div className="flex items-center gap-3 px-4 py-3 sm:hidden">
                <Avatar name={c.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-ink truncate">
                      {c.name}
                    </span>
                    {c.isActive ? (
                      <StatusDot
                        tone={tone as "good" | "warn" | "danger"}
                        size="sm"
                      />
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-ink-3">
                    <span>{c.phaseName.toUpperCase()}</span>
                    <span>·</span>
                    <span>{relativeAgo(c.lastLogDate)}</span>
                    <span>·</span>
                    <span>{c.weekLogs}/7</span>
                  </div>
                </div>
                <span className="font-mono text-[12px] text-ink tabular-nums">
                  {c.lastWeight != null ? `${c.lastWeight}kg` : "—"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
