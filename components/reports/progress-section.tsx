"use client";
import { useTranslations } from "next-intl";
import type { WeeklyReportRow } from "@/lib/reports/types";
import { SectionHeader, StatCard, GoalProgressBar } from "./report-parts";
import { WeightTrendChart, MeasurementsChart, StepsChart } from "./report-charts";

export function ProgressSection({ report, locale }: { report: WeeklyReportRow; locale: "hr" | "en" }) {
  void locale;
  const t = useTranslations("reports");
  const tm = useTranslations("reports.metrics");
  const m = report.metrics;
  const num = (n: number | null, dp = 0) => (n == null ? "—" : n.toFixed(dp));
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader micro="03" title={t("sections.progress")} />
      <GoalProgressBar
        start={m.weight.startWeightKg}
        now={m.weight.end}
        target={m.weight.targetWeightKg}
        labels={{ start: t("goalStart"), now: t("goalNow"), target: t("goalTarget") }}
      />
      <WeightTrendChart points={m.trends?.weightByWeek ?? []} target={m.weight.targetWeightKg} title={t("weightTrend")} />
      <MeasurementsChart points={m.trends?.measurements ?? []} titles={{ waist: t("waist"), bodyFat: t("bodyFat") }} />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label={tm("sleep")} value={`${num(m.sleepH.value, 1)} h`} />
        <StatCard label={tm("energy")} value={num(m.energy.value, 1)} />
      </div>
      <StepsChart daily={m.daily} title={tm("steps")} />
    </section>
  );
}
