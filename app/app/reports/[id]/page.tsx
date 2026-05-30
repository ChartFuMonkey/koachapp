import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ReportView } from "@/components/reports/report-view";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import type { WeeklyReportRow } from "@/lib/reports/types";

export default async function ClientReportDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      <ReportView report={report} locale={locale} />
    </div>
  );
}
