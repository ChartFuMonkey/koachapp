"use client";

import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import type { WeeklyMetrics, Trends } from "@/lib/reports/types";

const tooltipStyle = {
  background: "var(--surface-2)", border: "1px solid var(--hairline-2)",
  borderRadius: "8px", fontSize: "11px", color: "var(--ink)",
  padding: "6px 10px", fontFamily: "var(--font-geist-mono)",
};
const axisTickStyle = { fontSize: 10, fill: "var(--ink-3)", fontFamily: "var(--font-geist-mono)" };
const SERIES = ["var(--lime)", "var(--carb)", "var(--violet)", "#6aa8dd"];

function dM(d: string) { const x = new Date(d + "T00:00:00"); return `${x.getDate()}.${x.getMonth() + 1}.`; }

function ChartBox({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{title}</div>
      <div className="mt-3 h-[170px]">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </section>
  );
}

export function WeightTrendChart({ points, target, title }: { points: Trends["weightByWeek"]; target: number | null; title: string }) {
  if (points.length < 2) return null;
  const data = points.map((p) => ({ x: dM(p.weekStart), weight: p.value }));
  return (
    <ChartBox title={title}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs><linearGradient id="rdWt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--lime)" stopOpacity={0.25} /><stop offset="100%" stopColor="var(--lime)" stopOpacity={0} />
        </linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
        <XAxis dataKey="x" tick={axisTickStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} width={32} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
        {target != null && <ReferenceLine y={target} stroke="var(--lime)" strokeDasharray="4 4" />}
        <Area type="monotone" dataKey="weight" stroke="var(--lime)" strokeWidth={2} fill="url(#rdWt)" dot={{ r: 2 }} isAnimationActive={false} />
      </AreaChart>
    </ChartBox>
  );
}

export function StrengthChart({ series, title }: { series: Trends["strength"]; title: string }) {
  if (!series.length) return null;
  const weeks = [...new Set(series.flatMap((s) => s.points.map((p) => p.weekStart)))].sort();
  const data = weeks.map((w) => {
    const row: Record<string, string | number> = { x: dM(w) };
    series.forEach((s) => { const pt = s.points.find((p) => p.weekStart === w); if (pt) row[s.exercise] = pt.value; });
    return row;
  });
  return (
    <ChartBox title={title}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
        <XAxis dataKey="x" tick={axisTickStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={36} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
        {series.map((s, i) => (
          <Line key={s.exercise} type="monotone" dataKey={s.exercise} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
        ))}
      </LineChart>
    </ChartBox>
  );
}

export function MeasurementsChart({ points, titles }: { points: Trends["measurements"]; titles: { waist: string; bodyFat: string } }) {
  const waist = points.filter((p) => p.waistCm != null).map((p) => ({ x: dM(p.date), v: p.waistCm }));
  const bf = points.filter((p) => p.bodyFatPct != null).map((p) => ({ x: dM(p.date), v: p.bodyFatPct }));
  if (waist.length < 2 && bf.length < 2) return null;
  const mini = (title: string, data: { x: string; v: number | null }[], color: string) => (
    <ChartBox title={title}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
        <XAxis dataKey="x" tick={axisTickStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} width={32} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
      </LineChart>
    </ChartBox>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {waist.length >= 2 && mini(titles.waist, waist, "var(--lime)")}
      {bf.length >= 2 && mini(titles.bodyFat, bf, "var(--violet)")}
    </div>
  );
}

export function MacroBars({ m, title }: { m: WeeklyMetrics; title: string }) {
  const rows = [
    { name: "Protein", v: m.protein.value, t: m.protein.target, c: "#6aa8dd" },
    { name: "Carbs", v: m.carbs.value, t: m.carbs.target, c: "var(--carb)" },
    { name: "Fat", v: m.fat.value, t: m.fat.target, c: "var(--violet)" },
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{title}</div>
      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const pct = r.v != null && r.t ? Math.max(0, Math.min(100, (r.v / r.t) * 100)) : 0;
          return (
            <div key={r.name}>
              <div className="mb-1 flex justify-between text-[12px] text-ink-2">
                <span>{r.name}</span>
                <span className="font-mono text-ink-3">{r.v == null ? "—" : Math.round(r.v)}{r.t ? ` / ${r.t}` : ""} g</span>
              </div>
              <div className="h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full" style={{ width: `${pct}%`, background: r.c }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CaloriesChart({ daily, target, title }: { daily: WeeklyMetrics["daily"]; target: number | null; title: string }) {
  const data = daily.filter((d) => d.calories != null).map((d) => ({ x: dM(d.date), calories: d.calories }));
  if (data.length < 2) return null;
  return (
    <ChartBox title={title}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
        <XAxis dataKey="x" tick={axisTickStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={36} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
        {target != null && <ReferenceLine y={target} stroke="var(--ink-3)" strokeDasharray="4 4" />}
        <Line type="monotone" dataKey="calories" stroke="var(--carb)" strokeWidth={2} dot={{ r: 2, fill: "var(--carb)" }} isAnimationActive={false} />
      </LineChart>
    </ChartBox>
  );
}

export function StepsChart({ daily, title }: { daily: WeeklyMetrics["daily"]; title: string }) {
  const data = daily.filter((d) => d.steps != null).map((d) => ({ x: dM(d.date), steps: d.steps }));
  if (data.length < 2) return null;
  return (
    <ChartBox title={title}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
        <XAxis dataKey="x" tick={axisTickStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={36} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
        <Bar dataKey="steps" fill="var(--violet)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ChartBox>
  );
}
