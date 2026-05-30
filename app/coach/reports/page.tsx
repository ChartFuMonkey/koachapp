import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireCoach } from "@/lib/auth/require-coach";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { todayCET } from "@/lib/date";
import { weekBounds } from "@/lib/reports/week";
import type { WeeklyReportRow } from "@/lib/reports/types";

type OverviewRow = Pick<
  WeeklyReportRow,
  "id" | "client_id" | "week_start" | "week_end" | "status" | "flags" | "metrics" | "published_at"
>;

export default async function CoachReportsPage() {
  const t = await getTranslations("reports");
  const auth = await requireCoach();
  if (auth.error) return null; // middleware already gates /coach

  const { weekStart } = weekBounds(todayCET());

  const { data: rows } = await supabaseAdmin
    .from("weekly_reports")
    .select("id, client_id, week_start, week_end, status, flags, metrics, published_at")
    .eq("coach_id", auth.user.id)
    .order("week_start", { ascending: false })
    .limit(60);
  const reports = (rows ?? []) as OverviewRow[];

  const ids = [...new Set(reports.map((r) => r.client_id))];
  const { data: profs } = ids.length
    ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] };
  const nameOf = new Map(
    (profs ?? []).map((p) => [p.id as string, p.full_name as string])
  );

  const thisWeek = reports.filter((r) => r.week_start === weekStart);
  const history = reports.filter((r) => r.week_start !== weekStart);

  return (
    <div className="px-5 py-6 lg:px-8">
      <h1 className="mb-5 text-[24px] font-semibold text-ink tracking-tight">
        {t("title")}
      </h1>

      <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
        {t("overview")}
      </h2>
      {!thisWeek.length ? (
        <p className="text-[13px] text-ink-3">{t("coachEmpty")}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-[13px]">
            <tbody>
              {thisWeek.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/coach/reports/${r.id}`}
                      className="font-medium text-ink hover:text-lime"
                    >
                      {nameOf.get(r.client_id) ?? "—"}
                    </Link>
                  </td>
                  <td className="px-2 py-3 text-ink-2">
                    {r.metrics.weight?.changeKg != null
                      ? `${r.metrics.weight.changeKg > 0 ? "+" : ""}${r.metrics.weight.changeKg} kg`
                      : "—"}
                  </td>
                  <td className="px-2 py-3 text-ink-2">
                    {r.metrics.mealPlanAdherencePct != null
                      ? `${r.metrics.mealPlanAdherencePct}%`
                      : "—"}
                  </td>
                  <td className="px-2 py-3">
                    {r.flags?.length ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px]"
                        style={{
                          background:
                            "color-mix(in srgb, var(--warn) 15%, transparent)",
                          color: "var(--warn)",
                        }}
                      >
                        {r.flags.length}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="font-mono text-[10px] uppercase tracking-wide"
                      style={{
                        color:
                          r.status === "published"
                            ? "var(--good)"
                            : "var(--ink-3)",
                      }}
                    >
                      {r.status === "published" ? t("released") : t("draft")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {history.length > 0 && (
        <>
          <h2 className="mb-2 mt-7 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
            {t("history")}
          </h2>
          <ul className="flex flex-col gap-2">
            {history.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/coach/reports/${r.id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5 hover:bg-surface-2/60"
                >
                  <span className="text-[13px] text-ink">
                    {nameOf.get(r.client_id) ?? "—"}
                  </span>
                  <span className="font-mono text-[11px] text-ink-3">
                    {r.week_start}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
