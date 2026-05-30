"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { regenerateReport, releaseReport } from "@/actions/reports";
import { translateError } from "@/lib/translate-error";
import { ReportMetrics } from "@/components/reports/report-metrics";
import { FlagList } from "@/components/reports/flag-list";
import type { WeeklyReportRow } from "@/lib/reports/types";

export function ReviewForm({
  report,
  clientName,
}: {
  report: WeeklyReportRow;
  clientName: string;
}) {
  const t = useTranslations("reports");
  const tErr = useTranslations("reports.errors");
  const tCommon = useTranslations("errors");
  const router = useRouter();
  const locale = report.language;

  const published = report.status === "published";
  const [clientSummary, setClientSummary] = useState(report.client_summary ?? "");
  const [coachNote, setCoachNote] = useState(report.coach_note ?? "");
  const [pending, start] = useTransition();

  function onRegenerate() {
    start(async () => {
      const res = await regenerateReport(report.id);
      if (res.error) toast.error(translateError(res.error, tErr, tCommon));
      else {
        setClientSummary(res.data?.client_summary ?? "");
        toast.success(t("regenerate"));
        router.refresh();
      }
    });
  }

  function onRelease() {
    start(async () => {
      const res = await releaseReport(report.id, { clientSummary, coachNote });
      if (res.error) toast.error(translateError(res.error, tErr, tCommon));
      else {
        toast.success(t("released"));
        router.refresh();
      }
    });
  }

  return (
    <div className="px-5 py-6 lg:px-8 max-w-[640px]">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
        {clientName} · {report.week_start} – {report.week_end} ·{" "}
        <span style={{ color: published ? "var(--good)" : "var(--ink-3)" }}>
          {published ? t("released") : t("draft")}
        </span>
      </div>
      <h1 className="mb-5 text-[22px] font-semibold text-ink tracking-tight">
        {t("title")}
      </h1>

      {report.flags.length > 0 && (
        <section className="mb-5 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            {t("flags")}
          </div>
          <FlagList flags={report.flags} locale={locale} />
        </section>
      )}

      {report.coach_summary && (
        <section className="mb-5 rounded-xl border border-border bg-card p-4">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            {t("coachSummary")}
          </div>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">
            {report.coach_summary}
          </p>
        </section>
      )}

      {/* Editable client-facing summary */}
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
        {t("clientSummary")}
      </label>
      <textarea
        value={clientSummary}
        onChange={(e) => setClientSummary(e.target.value)}
        disabled={published || pending}
        rows={8}
        className="mb-4 w-full rounded-xl border border-border bg-card p-3 text-[14px] leading-relaxed text-ink outline-none focus:border-lime disabled:opacity-60"
      />

      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
        {t("coachNote")}
      </label>
      <textarea
        value={coachNote}
        onChange={(e) => setCoachNote(e.target.value)}
        disabled={published || pending}
        rows={3}
        placeholder={t("coachNotePlaceholder")}
        className="mb-5 w-full rounded-xl border border-border bg-card p-3 text-[14px] text-ink outline-none focus:border-lime disabled:opacity-60"
      />

      {!published && (
        <div className="mb-7 flex gap-3">
          <button
            onClick={onRegenerate}
            disabled={pending}
            className="rounded-lg border border-border px-4 py-2 text-[13px] text-ink-2 hover:bg-surface-2 disabled:opacity-50"
          >
            {t("regenerate")}
          </button>
          <button
            onClick={onRelease}
            disabled={pending}
            className="rounded-lg bg-lime px-4 py-2 text-[13px] font-medium text-bg hover:opacity-90 disabled:opacity-50"
          >
            {t("release")}
          </button>
        </div>
      )}

      {report.metrics.checkin && (
        <section className="mb-5 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            {t("checkinAnswers")}
          </div>
          <dl className="flex flex-col gap-2 text-[13px]">
            {report.metrics.checkin.whatWentWell && (
              <div className="flex gap-2">
                <dt className="text-ink-3">+</dt>
                <dd className="text-ink-2">{report.metrics.checkin.whatWentWell}</dd>
              </div>
            )}
            {report.metrics.checkin.challenges && (
              <div className="flex gap-2">
                <dt className="text-ink-3">!</dt>
                <dd className="text-ink-2">{report.metrics.checkin.challenges}</dd>
              </div>
            )}
            {report.metrics.checkin.questionsForCoach && (
              <div className="flex gap-2">
                <dt className="text-ink-3">?</dt>
                <dd className="text-ink">{report.metrics.checkin.questionsForCoach}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <ReportMetrics metrics={report.metrics} locale={locale} />
    </div>
  );
}
