"use client";
import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ExerciseScore } from "@/lib/reports/types";

/**
 * Coach-only per-exercise breakdown for the week: top set, set count, volume,
 * estimated 1RM, and the week-over-week e1RM delta (▲/▼/even, or "new").
 * Rendered in the coach review rail — never shown to the client.
 */
export function ExerciseScorecard({
  scorecard,
  locale,
}: {
  scorecard: ExerciseScore[];
  locale: "hr" | "en";
}) {
  const t = useTranslations("reports.scorecard");
  const loc = locale === "hr" ? "hr-HR" : "en-US";
  const nf = new Intl.NumberFormat(loc);
  const wf = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 });

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{t("title")}</span>
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
          {t("coachOnly")}
        </span>
      </div>

      {scorecard.length === 0 ? (
        <p className="text-[13px] text-ink-3">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {scorecard.map((r, i) => {
            let delta: ReactNode = null;
            if (!r.trainedLastWeek) {
              delta = (
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide" style={{ color: "var(--violet)" }}>
                  {t("new")}
                </span>
              );
            } else if (r.e1rmKg != null && r.prevE1rmKg != null) {
              const d = r.e1rmKg - r.prevE1rmKg;
              if (d >= 1) {
                delta = <span className="shrink-0 font-mono text-[11px]" style={{ color: "var(--good)" }}>▲ +{wf.format(d)} kg</span>;
              } else if (d <= -1) {
                delta = <span className="shrink-0 font-mono text-[11px]" style={{ color: "var(--warn)" }}>▼ {wf.format(d)} kg</span>;
              } else {
                delta = <span className="shrink-0 font-mono text-[11px] text-ink-3">▬ {t("even")}</span>;
              }
            }
            return (
              <li key={`${r.exercise}-${i}`} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[13px] text-ink">{r.exercise}</span>
                  {delta}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-ink-3">
                  <span className="text-ink-2">
                    {r.topWeightKg != null ? (
                      <>
                        {wf.format(r.topWeightKg)} kg × {r.topReps ?? "—"}
                      </>
                    ) : r.topReps != null ? (
                      <>× {r.topReps}</>
                    ) : (
                      "—"
                    )}
                    {r.isWeightPR && <span className="ml-1 text-lime">★</span>}
                  </span>
                  <span>·</span>
                  <span>
                    {r.sets} {t("sets")}
                  </span>
                  {r.volumeKg > 0 && (
                    <>
                      <span>·</span>
                      <span>{nf.format(r.volumeKg)} kg</span>
                    </>
                  )}
                  {r.e1rmKg != null && (
                    <>
                      <span>·</span>
                      <span>e1RM {nf.format(r.e1rmKg)}</span>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
