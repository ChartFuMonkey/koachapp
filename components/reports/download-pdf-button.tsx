"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { WeeklyReportRow } from "@/lib/reports/types";
import type { PdfLabels } from "@/lib/reports/pdf";

export function DownloadPdfButton({
  report,
  locale,
  clientName,
  filename,
  label,
}: {
  report: WeeklyReportRow;
  locale: "hr" | "en";
  clientName: string;
  filename: string;
  label: string;
}) {
  const t = useTranslations("reports");
  const tm = useTranslations("reports.metrics");
  const [busy, setBusy] = useState(false);
  const hr = locale === "hr";

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      const [pdf, regular, semibold, mono] = await Promise.all([
        import("@/lib/reports/pdf"),
        fetch("/fonts/IBMPlexSans-Regular.ttf").then((r) => r.arrayBuffer()),
        fetch("/fonts/IBMPlexSans-SemiBold.ttf").then((r) => r.arrayBuffer()),
        fetch("/fonts/IBMPlexMono-Regular.ttf").then((r) => r.arrayBuffer()),
      ]);

      const labels: PdfLabels = {
        reportTitle: hr ? "Tjedni izvještaj" : "Weekly report",
        draft: t("draft"),
        weight: tm("weight"),
        calories: tm("calories"),
        protein: tm("protein"),
        carbs: hr ? "Ugljikohidrati" : "Carbs",
        fat: hr ? "Masti" : "Fat",
        steps: tm("steps"),
        sleep: tm("sleep"),
        energy: tm("energy"),
        adherence: tm("adherence"),
        training: tm("training"),
        volume: hr ? "Volumen" : "Volume",
        vsTarget: tm("vsTarget"),
        daysLogged: () => (hr ? "Dana uneseno" : "Days logged"),
        sessions: hr ? "Treninzi" : "Sessions",
        sectionNutrition: t("sections.nutrition"),
        sectionTraining: t("sections.training"),
        sectionProgress: t("sections.progress"),
        weightTrend: t("weightTrend"),
        caloriesTrend: hr ? "Kalorije / dan" : "Calories / day",
        macros: t("macros"),
        waist: t("waist"),
        bodyFat: t("bodyFat"),
        goalStart: t("goalStart"),
        goalNow: t("goalNow"),
        goalTarget: t("goalTarget"),
        adherence7d: t("adherence7d"),
        personalBests: t("personalBests"),
        summary: t("clientSummary"),
        recommendations: t("recommendations"),
        recTraining: t("recTraining"),
        recNutrition: t("recNutrition"),
        recGeneral: t("recGeneral"),
        generatedOn: (d) => t("generatedOn", { date: d }),
      };

      const doc = pdf.buildReportPdf({
        report,
        locale,
        clientName,
        labels,
        fonts: {
          regular: new Uint8Array(regular),
          semibold: new Uint8Array(semibold),
          mono: new Uint8Array(mono),
        },
      });
      doc.save(filename);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-[12px] text-ink-2 hover:bg-surface-2 disabled:opacity-50"
    >
      {busy ? "…" : label}
    </button>
  );
}
