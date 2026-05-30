import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ReportMetrics } from "@/components/reports/report-metrics";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import type { WeeklyReportRow } from "@/lib/reports/types";

function formatWeek(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return `${s.getDate()}.${s.getMonth() + 1}. – ${e.getDate()}.${e.getMonth() + 1}.`;
}

export default async function ClientReportDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("reports");
  const locale = (await getLocale()) === "en" ? "en" : "hr";
  const supabase = await createClient();

  // RLS guarantees: own + published only.
  const { data } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const report = data as WeeklyReportRow;

  return (
    <div className="px-5 pt-5 pb-10">
      <MicroLabel>~/Reports</MicroLabel>
      <h1 className="mt-1 mb-1 text-[26px] font-semibold leading-tight text-ink tracking-tight">
        {t("weekOf", { date: formatWeek(report.week_start, report.week_end) })}
      </h1>

      {report.coach_note && (
        <div className="my-4 rounded-xl border border-lime/30 bg-lime/5 p-4 text-[14px] leading-relaxed text-ink">
          {report.coach_note}
        </div>
      )}

      {report.client_summary && (
        <div className="my-4 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">
          {report.client_summary}
        </div>
      )}

      <ReportMetrics metrics={report.metrics} locale={locale} />
    </div>
  );
}
