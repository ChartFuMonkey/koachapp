"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { getProgressData } from "@/actions/daily-log";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { EmptyState } from "@/components/ui/athletic/empty-state";

type LogEntry = {
  log_date: string;
  weight_kg: number | null;
  calories_kcal: number | null;
  steps: number | null;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

function NoData({ text }: { text: string }) {
  return <EmptyState glyph="◍" label={text} hint="LOG DAYS TO SEE TREND" />;
}

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

export default function ProgressPage() {
  const t = useTranslations("app.progress");
  const [data, setData] = useState<LogEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getProgressData();
      if (result.data) setData(result.data as LogEntry[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-ink-3" />
      </div>
    );
  }

  const chartData = (data || []).map((d) => ({
    date: formatDate(d.log_date),
    weight: d.weight_kg,
    calories: d.calories_kcal,
    steps: d.steps,
  }));

  const weightData = chartData.filter((d) => d.weight != null);
  const caloriesData = chartData.filter((d) => d.calories != null);
  const stepsData = chartData.filter((d) => d.steps != null);

  return (
    <div className="px-5 md:px-8 pt-5 pb-6">
      <MicroLabel>~/Progress</MicroLabel>
      <h1 className="mt-1 mb-5 text-[28px] md:text-[32px] font-semibold leading-tight text-ink tracking-tight">
        {t("title")}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3.5">
      {/* Weight */}
      <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2 xl:col-span-1">
        <MicroLabel>{t("weightTitle").toUpperCase()}</MicroLabel>
        {weightData.length < 3 ? (
          <NoData text={t("noData")} />
        ) : (
          <div className="mt-3 h-[180px] lg:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="progressWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--lime)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--lime)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
                <XAxis dataKey="date" tick={axisTickStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} width={32} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--lime)"
                  strokeWidth={2}
                  fill="url(#progressWeight)"
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--lime)", stroke: "var(--bg)", strokeWidth: 2 }}
                  name={t("weightLabel")}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Calories */}
      <section className="rounded-xl border border-border bg-card p-5">
        <MicroLabel>{t("caloriesTitle").toUpperCase()}</MicroLabel>
        {caloriesData.length < 3 ? (
          <NoData text={t("noData")} />
        ) : (
          <div className="mt-3 h-[180px] lg:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={caloriesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
                <XAxis dataKey="date" tick={axisTickStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
                <Line
                  type="monotone"
                  dataKey="calories"
                  stroke="var(--carb)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "var(--carb)" }}
                  activeDot={{ r: 4 }}
                  name={t("caloriesLabel")}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Steps */}
      <section className="rounded-xl border border-border bg-card p-5">
        <MicroLabel>{t("stepsTitle").toUpperCase()}</MicroLabel>
        {stepsData.length < 3 ? (
          <NoData text={t("noData")} />
        ) : (
          <div className="mt-3 h-[180px] lg:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stepsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
                <XAxis dataKey="date" tick={axisTickStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink-3)" }} />
                <Bar
                  dataKey="steps"
                  fill="var(--violet)"
                  radius={[3, 3, 0, 0]}
                  name={t("stepsLabel")}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
