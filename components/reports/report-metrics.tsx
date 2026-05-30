"use client";

import { useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { WeeklyMetrics, MetricPair } from "@/lib/reports/types";

const tooltipStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--hairline-2)",
  borderRadius: "8px",
  fontSize: "11px",
  color: "var(--ink)",
  padding: "6px 10px",
  fontFamily: "var(--font-geist-mono)",
};
const axisTickStyle = {
  fontSize: 10,
  fill: "var(--ink-3)",
  fontFamily: "var(--font-geist-mono)",
};

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${dt.getDate()}.${dt.getMonth() + 1}.`;
}

function Delta({ pair, invert = false }: { pair: MetricPair; invert?: boolean }) {
  if (pair.value == null || pair.prev == null) return null;
  const diff = Math.round((pair.value - pair.prev) * 10) / 10;
  if (diff === 0) return <span className="text-ink-3">—</span>;
  const good = invert ? diff < 0 : diff > 0;
  return (
    <span style={{ color: good ? "var(--good)" : "var(--warn)" }}>
      {diff > 0 ? "↑" : "↓"} {Math.abs(diff)}
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-ink tracking-tight">
          {value}
        </span>
        {delta && <span className="text-[12px] font-mono">{delta}</span>}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-3">{sub}</div>}
    </div>
  );
}

export function ReportMetrics({
  metrics,
  locale,
}: {
  metrics: WeeklyMetrics;
  locale: "hr" | "en";
}) {
  void locale;
  const t = useTranslations("reports.metrics");
  const tr = useTranslations("reports");
  const m = metrics;
  const num = (n: number | null, dp = 0) => (n == null ? "—" : n.toFixed(dp));

  const weightData = m.daily.filter((d) => d.weightKg != null);
  const caloriesData = m.daily.filter((d) => d.calories != null);
  const stepsData = m.daily.filter((d) => d.steps != null);

  return (
    <div className="flex flex-col gap-5">
      <div className="text-[12px] text-ink-3 font-mono">
        {t("daysLogged", { n: m.daysLogged })}
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label={t("weight")}
          value={`${num(m.weight.end, 1)} kg`}
          sub={
            m.weight.targetWeightKg != null
              ? `${t("vsTarget")} ${m.weight.targetWeightKg} kg`
              : undefined
          }
          delta={
            m.weight.changeKg != null ? (
              <span
                style={{
                  color: (
                    m.phase?.type === "muscle_gain"
                      ? m.weight.changeKg > 0
                      : m.weight.changeKg < 0
                  )
                    ? "var(--good)"
                    : "var(--warn)",
                }}
              >
                {m.weight.changeKg > 0 ? "+" : ""}
                {m.weight.changeKg} kg
              </span>
            ) : undefined
          }
        />
        <Stat
          label={t("calories")}
          value={num(m.calories.value)}
          sub={m.calories.target ? `${t("vsTarget")} ${m.calories.target}` : undefined}
          delta={<Delta pair={m.calories} />}
        />
        <Stat
          label={t("protein")}
          value={`${num(m.protein.value)} g`}
          sub={
            m.protein.target ? `${t("vsTarget")} ${m.protein.target} g` : undefined
          }
          delta={<Delta pair={m.protein} />}
        />
        <Stat
          label={t("steps")}
          value={num(m.steps.value)}
          sub={m.steps.target ? `${t("vsTarget")} ${m.steps.target}` : undefined}
          delta={<Delta pair={m.steps} />}
        />
        <Stat
          label={t("sleep")}
          value={`${num(m.sleepH.value, 1)} h`}
          delta={<Delta pair={m.sleepH} />}
        />
        <Stat
          label={t("adherence")}
          value={
            m.mealPlanAdherencePct == null ? "—" : `${m.mealPlanAdherencePct}%`
          }
        />
        <Stat
          label={t("training")}
          value={
            m.training.sessionsPlanned != null
              ? t("sessions", {
                  done: m.training.sessionsDone,
                  planned: m.training.sessionsPlanned,
                })
              : String(m.training.sessionsDone)
          }
        />
        <Stat
          label={t("energy")}
          value={num(m.energy.value, 1)}
          delta={<Delta pair={m.energy} />}
        />
      </div>

      {/* Personal bests */}
      {m.training.personalBests.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            ★ {tr("personalBests")}
          </div>
          <ul className="mt-2 flex flex-col gap-1 text-[13px] text-ink">
            {m.training.personalBests.map((pb, i) => (
              <li key={i}>
                {pb.exercise}: <b>{pb.weightKg} kg</b> × {pb.reps}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weight chart */}
      {weightData.length >= 2 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            {t("weight")}
          </div>
          <div className="mt-3 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={weightData.map((d) => ({
                  date: fmtDate(d.date),
                  weight: d.weightKg,
                }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="rptWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--lime)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--lime)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--hairline)"
                  vertical={false}
                />
                <XAxis dataKey="date" tick={axisTickStyle} tickLine={false} axisLine={false} />
                <YAxis
                  tick={axisTickStyle}
                  tickLine={false}
                  axisLine={false}
                  domain={["dataMin - 1", "dataMax + 1"]}
                  width={32}
                />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--lime)"
                  strokeWidth={2}
                  fill="url(#rptWeight)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Calories chart with target line */}
      {caloriesData.length >= 2 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            {t("calories")}
          </div>
          <div className="mt-3 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={caloriesData.map((d) => ({
                  date: fmtDate(d.date),
                  calories: d.calories,
                }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--hairline)"
                  vertical={false}
                />
                <XAxis dataKey="date" tick={axisTickStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
                {m.calories.target != null && (
                  <ReferenceLine
                    y={m.calories.target}
                    stroke="var(--ink-3)"
                    strokeDasharray="4 4"
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="calories"
                  stroke="var(--carb)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "var(--carb)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Steps chart */}
      {stepsData.length >= 2 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            {t("steps")}
          </div>
          <div className="mt-3 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stepsData.map((d) => ({
                  date: fmtDate(d.date),
                  steps: d.steps,
                }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--hairline)"
                  vertical={false}
                />
                <XAxis dataKey="date" tick={axisTickStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
                <Bar dataKey="steps" fill="var(--violet)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
