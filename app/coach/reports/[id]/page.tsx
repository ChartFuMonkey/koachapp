import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireCoach } from "@/lib/auth/require-coach";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { WeeklyReportRow } from "@/lib/reports/types";
import { ReviewForm } from "./review-form";

export default async function CoachReportReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getTranslations("reports"); // ensure namespace available server-side
  const auth = await requireCoach();
  if (auth.error) return null;

  const { data } = await supabaseAdmin
    .from("weekly_reports")
    .select("*")
    .eq("id", id)
    .eq("coach_id", auth.user.id)
    .maybeSingle();
  if (!data) notFound();

  const report = data as WeeklyReportRow;
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", report.client_id)
    .maybeSingle();

  return <ReviewForm report={report} clientName={prof?.full_name ?? "—"} />;
}
