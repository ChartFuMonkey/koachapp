"use server";

import { revalidatePath } from "next/cache";
import { requireCoach, requireCoachOwnsClient } from "@/lib/auth/require-coach";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { todayCET } from "@/lib/date";
import { generateReportForClient } from "@/lib/reports/generate";
import { sendPushToClient } from "@/lib/push";
import type { WeeklyReportRow } from "@/lib/reports/types";

export async function generateNow(
  clientId: string
): Promise<{ data?: WeeklyReportRow; error?: string }> {
  const auth = await requireCoachOwnsClient(clientId);
  if (auth.error) return { error: auth.error };
  try {
    const report = await generateReportForClient(clientId, todayCET());
    revalidatePath("/coach/reports");
    return { data: report };
  } catch (err) {
    console.error("generateNow error:", err);
    return { error: "generateFailed" };
  }
}

export async function regenerateReport(
  reportId: string
): Promise<{ data?: WeeklyReportRow; error?: string }> {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data: rep } = await supabaseAdmin
    .from("weekly_reports")
    .select("id, client_id, week_start, status, coach_id")
    .eq("id", reportId)
    .maybeSingle();
  if (!rep) return { error: "notFound" };
  if (rep.coach_id !== auth.user.id) return { error: "unauthenticated" };
  if (rep.status === "published") return { error: "alreadyPublished" };

  try {
    const report = await generateReportForClient(rep.client_id, rep.week_start);
    revalidatePath(`/coach/reports/${reportId}`);
    return { data: report };
  } catch (err) {
    console.error("regenerateReport error:", err);
    return { error: "generateFailed" };
  }
}

export async function releaseReport(
  reportId: string,
  payload: { clientSummary: string; coachNote: string }
): Promise<{ success?: true; error?: string }> {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data: rep } = await supabaseAdmin
    .from("weekly_reports")
    .select("id, client_id, coach_id, language")
    .eq("id", reportId)
    .maybeSingle();
  if (!rep) return { error: "notFound" };
  if (rep.coach_id !== auth.user.id) return { error: "unauthenticated" };

  const { error } = await supabaseAdmin
    .from("weekly_reports")
    .update({
      client_summary: payload.clientSummary,
      coach_note: payload.coachNote,
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) {
    console.error("releaseReport error:", error);
    return { error: "releaseFailed" };
  }

  const copy =
    rep.language === "en"
      ? {
          title: "Your weekly report is ready",
          body: "Tap to see your week in review.",
        }
      : {
          title: "Tvoj tjedni izvještaj je spreman",
          body: "Otvori i pogledaj svoj tjedan.",
        };
  await sendPushToClient(rep.client_id, copy.title, copy.body);

  revalidatePath("/coach/reports");
  revalidatePath(`/coach/reports/${reportId}`);
  revalidatePath("/app/reports");
  return { success: true };
}
