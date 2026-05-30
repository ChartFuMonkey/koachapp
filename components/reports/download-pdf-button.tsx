"use client";
import { useState } from "react";

export function DownloadPdfButton({
  targetRef, filename, label,
}: { targetRef: React.RefObject<HTMLDivElement | null>; filename: string; label: string }) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    const node = targetRef.current;
    if (!node || busy) return;
    setBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const bg = getComputedStyle(document.body).getPropertyValue("--bg").trim() || "#0A0B0D";
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: bg, useCORS: true });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pw) / canvas.width;
      let pos = 0;
      pdf.addImage(img, "PNG", 0, pos, pw, imgH);
      let remaining = imgH - ph;
      while (remaining > 0) {
        pos -= ph;
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, pos, pw, imgH);
        remaining -= ph;
      }
      pdf.save(filename);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      data-html2canvas-ignore
      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-[12px] text-ink-2 hover:bg-surface-2 disabled:opacity-50"
    >
      {busy ? "…" : label}
    </button>
  );
}
