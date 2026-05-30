"use client";
import { useTranslations } from "next-intl";
import type { WeeklyReportRow } from "@/lib/reports/types";
import { SectionHeader, StatCard, AdherenceDots, RecommendationBlock } from "./report-parts";
import { MacroBars, CaloriesChart } from "./report-charts";

export function NutritionSection({ report }: { report: WeeklyReportRow }) {
  const t = useTranslations("reports");
  const tm = useTranslations("reports.metrics");
  const m = report.metrics;
  const num = (n: number | null) => (n == null ? "—" : Math.round(n).toString());
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader micro="01" title={t("sections.nutrition")} />
      <RecommendationBlock icon="🍽️" label={t("recommendations")} text={report.rec_nutrition} />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label={tm("calories")} value={num(m.calories.value)} sub={m.calories.target ? `${tm("vsTarget")} ${m.calories.target}` : undefined} />
        <StatCard label={tm("adherence")} value={m.mealPlanAdherencePct == null ? "—" : `${m.mealPlanAdherencePct}%`} />
      </div>
      <MacroBars m={m} title={t("macros")} />
      <AdherenceDots daily={m.daily} label={t("adherence7d")} />
      <CaloriesChart daily={m.daily} target={m.calories.target} title={tm("calories")} />
    </section>
  );
}
