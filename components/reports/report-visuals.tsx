"use client";
import { useTranslations } from "next-intl";
import type { WeeklyReportRow } from "@/lib/reports/types";
import {
  WeightTrendChart,
  CaloriesChart,
  MacroBars,
  StrengthChart,
  StepsChart,
  MeasurementsChart,
} from "./report-charts";

/**
 * The report's graphs, grouped for the coach review's right rail.
 * Container-query driven: one column when the rail is narrow, two when it's
 * wide. Charts that lack enough data render nothing, so the grid auto-flows.
 */
export function ReportVisuals({ report }: { report: WeeklyReportRow }) {
  const t = useTranslations("reports");
  const tm = useTranslations("reports.metrics");
  const m = report.metrics;
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
        <WeightTrendChart points={m.trends?.weightByWeek ?? []} target={m.weight.targetWeightKg} title={t("weightTrend")} />
        <CaloriesChart daily={m.daily} target={m.calories.target} title={tm("calories")} />
        <MacroBars m={m} title={t("macros")} />
        <StrengthChart series={m.trends?.strength ?? []} title={t("strengthTrend")} />
        <StepsChart daily={m.daily} title={tm("steps")} />
        <div className="@lg:col-span-2">
          <MeasurementsChart points={m.trends?.measurements ?? []} titles={{ waist: t("waist"), bodyFat: t("bodyFat") }} />
        </div>
      </div>
    </div>
  );
}
