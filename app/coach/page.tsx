import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { CommandSearchButton } from "@/components/coach-shell/command-search-button";
import {
  MobileRoster,
  type MobileRosterClient,
} from "@/components/coach-shell/mobile-roster";
import {
  RosterTable,
  type RosterRow,
} from "@/components/coach-shell/roster-table";
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
      .select("rpe, created_at, workout_sessions!inner(client_id, session_date)")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(2000),
  ]);

  const phases = phasesRes.data || [];
  const logs = logsRes.data || [];
  const profiles = profilesRes.data || [];
  // exercise_logs has no client_id of its own — it links to the client through
  // its workout_session. Flatten the joined row into a simple shape and keep
  // only rows for the coach's own clients.
  const clientIdSet = new Set(clientIds);
  const rpeLogs = ((rpeRes.data || []) as unknown[]).flatMap((row) => {
    const r = row as {
      rpe: number | null;
      session_date?: string | null;
      workout_sessions:
        | { client_id: string; session_date: string | null }
        | { client_id: string; session_date: string | null }[]
        | null;
    };
    const ws = Array.isArray(r.workout_sessions)
      ? r.workout_sessions[0]
      : r.workout_sessions;
    if (!ws || !clientIdSet.has(ws.client_id)) return [];
    return [
      {
        client_id: ws.client_id,
        rpe: r.rpe,
        session_date: ws.session_date,
      },
    ];
  });

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
  // Real 10-day average-RPE series across all clients (rounded to 1 decimal).
  // Days with no logged RPE carry 0 so the sparkline reads as a genuine trend.
  const sparkRpe = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(Date.now() - (9 - i) * 86400000)
      .toISOString()
      .slice(0, 10);
    const dayVals = rpeLogs
      .filter((r) => r.session_date === d && r.rpe != null)
      .map((r) => Number(r.rpe));
    if (dayVals.length === 0) return 0;
    return (
      Math.round(
        (dayVals.reduce((a, b) => a + b, 0) / dayVals.length) * 10
      ) / 10
    );
  });

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

  // Precompute every display value server-side so the interactive table stays
  // a pure presentational client component (filter/sort only).
  const rosterRows: RosterRow[] = clientData.map((c) => {
    const tone =
      c.weekLogs >= 4 ? "good" : c.weekLogs >= 1 ? "warn" : "danger";
    const phase = normalizePhase(c.phaseName);
    const deltaColor = toneToColorVar(weightDeltaTone(c.weekDelta, phase));
    const deltaText =
      c.weekDelta === null
        ? "—"
        : `${c.weekDelta > 0 ? "+" : ""}${c.weekDelta.toFixed(1)}`;
    return {
      id: c.id,
      name: c.name,
      phaseName: c.phaseName,
      phaseKind: phase ?? "",
      lastAgo: relativeAgo(c.lastLogDate),
      lastLogDate: c.lastLogDate,
      lastWeight: c.lastWeight,
      weekDelta: c.weekDelta,
      deltaColor,
      deltaText,
      adherencePct: c.adherencePct,
      avgRpe: c.avgRpe,
      weekLogs: c.weekLogs,
      tone: tone as "good" | "warn" | "danger",
    };
  });

  const rosterLabels = {
    client: t("colClient"),
    phase: t("colPhase"),
    last: t("colLast"),
    weight: t("colWeight"),
    delta: t("colDelta"),
    adherence: t("colAdherence"),
    rpe: t("colRpe"),
    sort: t("sort"),
    filters: {
      all: t("filterAll"),
      ontrack: t("filterOnTrack"),
      attention: t("filterAttention"),
      overdue: t("filterOverdue"),
      cut: t("filterCut"),
      bulk: t("filterBulk"),
      recomp: t("filterRecomp"),
    },
    sorts: {
      last: t("sortLastLog"),
      adherence: t("sortAdherence"),
      name: t("sortName"),
      delta: t("sortDelta"),
    },
  };

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
          <CommandSearchButton label={t("search")} />
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

      {/* Filter chips + sort + desktop roster table (interactive) */}
      <RosterTable rows={rosterRows} labels={rosterLabels} />

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
