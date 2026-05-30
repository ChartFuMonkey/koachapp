import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/athletic/empty-state";
import { MicroLabel } from "@/components/ui/athletic/micro-label";

function formatWeek(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return `${s.getDate()}.${s.getMonth() + 1}. – ${e.getDate()}.${e.getMonth() + 1}.`;
}

export default async function ClientReportsPage() {
  const t = await getTranslations("reports");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: reports } = user
    ? await supabase
        .from("weekly_reports")
        .select("id, week_start, week_end, published_at")
        .eq("client_id", user.id)
        .eq("status", "published")
        .order("week_start", { ascending: false })
    : { data: [] };

  return (
    <div className="px-5 pt-5 pb-6">
      <MicroLabel>~/Reports</MicroLabel>
      <h1 className="mt-1 mb-5 text-[28px] font-semibold leading-tight text-ink tracking-tight">
        {t("title")}
      </h1>

      {!reports?.length ? (
        <EmptyState glyph="◔" label={t("empty")} hint="" />
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`/app/reports/${r.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-surface-2/60"
              >
                <span className="text-[15px] font-medium text-ink">
                  {t("weekOf", { date: formatWeek(r.week_start, r.week_end) })}
                </span>
                <span aria-hidden className="text-ink-3">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
