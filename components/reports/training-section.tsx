"use client";
import { useTranslations } from "next-intl";
import type { WeeklyReportRow } from "@/lib/reports/types";
import { SectionHeader, StatCard, PersonalBests, RecommendationBlock } from "./report-parts";
import { StrengthChart } from "./report-charts";

export function TrainingSection({ report }: { report: WeeklyReportRow }) {
  const t = useTranslations("reports");
  const tm = useTranslations("reports.metrics");
  const m = report.metrics;
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader micro="02" title={t("sections.training")} />
      <RecommendationBlock icon="🏋️" label={t("recommendations")} text={report.rec_training} />
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={tm("training")}
          value={m.training.sessionsPlanned != null ? tm("sessions", { done: m.training.sessionsDone, planned: m.training.sessionsPlanned }) : String(m.training.sessionsDone)}
        />
        <StatCard label="Volume" value={m.training.totalVolumeKg == null ? "—" : `${m.training.totalVolumeKg} kg`} />
      </div>
      <PersonalBests bests={m.training.personalBests} title={t("personalBests")} />
      <StrengthChart series={m.trends?.strength ?? []} title={t("strengthTrend")} />
    </section>
  );
}
