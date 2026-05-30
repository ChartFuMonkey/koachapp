"use client";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import type { WeeklyReportRow } from "@/lib/reports/types";
import { RecommendationBlock } from "./report-parts";
import { NutritionSection } from "./nutrition-section";
import { TrainingSection } from "./training-section";
import { ProgressSection } from "./progress-section";
import { DownloadPdfButton } from "./download-pdf-button";

function weekLabel(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return `${s.getDate()}.${s.getMonth() + 1}. – ${e.getDate()}.${e.getMonth() + 1}.`;
}

export function ReportView({ report, locale }: { report: WeeklyReportRow; locale: "hr" | "en" }) {
  const t = useTranslations("reports");
  const ref = useRef<HTMLDivElement>(null);
  const m = report.metrics;
  const change = m.weight.changeKg;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
          {t("weekOf", { date: weekLabel(report.week_start, report.week_end) })}
          {m.phase?.name ? ` · ${m.phase.name}` : ""}
        </div>
        <DownloadPdfButton targetRef={ref} filename={`koachapp-report-${report.week_start}.pdf`} label={t("downloadPdf")} />
      </div>

      <div ref={ref} className="flex flex-col gap-6 bg-bg">
        {/* Hero headline */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">{t("title")}</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-[30px] font-semibold tracking-tight text-ink">{m.weight.end == null ? "—" : `${m.weight.end} kg`}</span>
            {change != null && (
              <span className="font-mono text-[14px]" style={{ color: change <= 0 ? "var(--good)" : "var(--warn)" }}>
                {change > 0 ? "+" : ""}{change} kg
              </span>
            )}
          </div>
        </div>

        {/* General recommendation + AI summary */}
        <RecommendationBlock icon="💬" label={t("recommendations")} text={report.rec_general} />
        {report.client_summary && (
          <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">{report.client_summary}</div>
        )}

        <NutritionSection report={report} />
        <TrainingSection report={report} />
        <ProgressSection report={report} locale={locale} />

        <div className="border-t border-border pt-3 text-center font-mono text-[10px] text-ink-3">
          {t("generatedOn", { date: new Date(report.generated_at).toLocaleDateString() })}
        </div>
      </div>
    </div>
  );
}
