// lib/reports/pdf.ts
// Builds a polished, dark, vector weekly-report PDF that matches the app's look.
// Pure + isomorphic: the browser passes fetched font bytes, the Node test passes
// bytes read from disk — identical output either way. No html2canvas, no raster.

import { jsPDF, GState } from "jspdf";
import type { WeeklyReportRow } from "./types";

/** Font file bytes (IBM Plex). Caller supplies them (fetch in browser, fs in Node). */
export type PdfFonts = {
  regular: Uint8Array;
  semibold: Uint8Array;
  mono: Uint8Array;
};

/** All user-facing strings, pre-translated by the caller via next-intl. */
export type PdfLabels = {
  reportTitle: string; // "Tjedni izvještaj"
  draft: string;
  weight: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  steps: string;
  sleep: string;
  energy: string;
  adherence: string;
  training: string;
  volume: string;
  vsTarget: string;
  daysLogged: (n: number) => string; // "7 / 7 dana"
  sessions: string; // "Treninzi"
  sectionNutrition: string;
  sectionTraining: string;
  sectionProgress: string;
  weightTrend: string;
  caloriesTrend: string;
  macros: string;
  waist: string;
  bodyFat: string;
  goalStart: string;
  goalNow: string;
  goalTarget: string;
  adherence7d: string;
  personalBests: string;
  summary: string; // "Sažetak"
  recommendations: string;
  recTraining: string;
  recNutrition: string;
  recGeneral: string;
  generatedOn: (date: string) => string;
};

// ── Palette (mirrors app/globals.css) ───────────────────────────────────────
const C = {
  bg: "#06070A",
  card: "#111317",
  card2: "#0E1014",
  surface2: "#171A1F",
  border: "#1F242B",
  hairline2: "#2A3038",
  ink: "#F5F7FA",
  ink2: "#9BA3AE",
  ink3: "#5A6270",
  ink4: "#3B4250",
  lime: "#C5F73B",
  good: "#3DE8A0",
  warn: "#FF8A3D",
  carb: "#FBBF24",
  violet: "#A78BFA",
  blue: "#6AA8DD",
} as const;

const FONT = "plex";
const MONO = "plexmono";

// Page geometry (A4 portrait, points)
const PW = 595.28;
const PH = 841.89;
const M = 38; // outer margin
const CW = PW - M * 2; // content width
const GAP = 10;
const FOOTER_H = 28;

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function buildReportPdf(args: {
  report: WeeklyReportRow;
  locale: "hr" | "en";
  clientName: string;
  labels: PdfLabels;
  fonts: PdfFonts;
}): jsPDF {
  const { report, locale, clientName, labels: L, fonts } = args;
  const m = report.metrics;
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  doc.setLineHeightFactor(1.3);

  // Register fonts: "plex" (normal+bold) and "plexmono" (normal).
  doc.addFileToVFS("PlexSans.ttf", toBase64(fonts.regular));
  doc.addFont("PlexSans.ttf", FONT, "normal");
  doc.addFileToVFS("PlexSansSB.ttf", toBase64(fonts.semibold));
  doc.addFont("PlexSansSB.ttf", FONT, "bold");
  doc.addFileToVFS("PlexMono.ttf", toBase64(fonts.mono));
  doc.addFont("PlexMono.ttf", MONO, "normal");

  // ── number / date formatting ───────────────────────────────────────────
  const nf = new Intl.NumberFormat(locale === "hr" ? "hr-HR" : "en-US");
  const fmt = (n: number | null | undefined, dp = 0) =>
    n == null || Number.isNaN(n)
      ? "—"
      : new Intl.NumberFormat(locale === "hr" ? "hr-HR" : "en-US", {
          minimumFractionDigits: dp,
          maximumFractionDigits: dp,
        }).format(n);
  const dM = (d: string) => {
    const x = new Date(d + "T00:00:00");
    return `${x.getDate()}.${x.getMonth() + 1}.`;
  };

  // ── low-level draw helpers ─────────────────────────────────────────────
  const fill = (hex: string) => doc.setFillColor(hex);
  const stroke = (hex: string) => doc.setDrawColor(hex);
  const ink = (hex: string) => doc.setTextColor(hex);

  function paintPage() {
    fill(C.bg);
    doc.rect(0, 0, PW, PH, "F");
  }

  function card(x: number, y: number, w: number, h: number, r = 10, bg: string = C.card, bd: string = C.border) {
    fill(bg);
    stroke(bd);
    doc.setLineWidth(0.75);
    doc.roundedRect(x, y, w, h, r, r, "FD");
  }

  // tiny uppercase tracked label (mono), returns nothing
  function micro(x: number, y: number, text: string, color: string = C.ink3) {
    doc.setFont(MONO, "normal");
    doc.setFontSize(6.6);
    ink(color);
    doc.text(text.toUpperCase(), x, y, { baseline: "top", charSpace: 0.4 });
  }

  function label(x: number, y: number, text: string, size: number, color: string, bold = false, opts: { mono?: boolean; align?: "left" | "center" | "right"; charSpace?: number } = {}) {
    doc.setFont(opts.mono ? MONO : FONT, bold ? "bold" : "normal");
    doc.setFontSize(size);
    ink(color);
    doc.text(text, x, y, { baseline: "top", align: opts.align ?? "left", charSpace: opts.charSpace ?? 0 });
  }

  // ── pagination cursor ──────────────────────────────────────────────────
  let y = M;
  paintPage();
  function ensure(h: number) {
    if (y + h > PH - FOOTER_H) {
      doc.addPage();
      paintPage();
      y = M;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 1. HEADER
  // ════════════════════════════════════════════════════════════════════════
  {
    // lime "K" logo
    fill(C.lime);
    doc.roundedRect(M, y, 26, 26, 7, 7, "F");
    doc.setFont(FONT, "bold");
    doc.setFontSize(17);
    ink(C.bg);
    doc.text("K", M + 13, y + 14.5, { align: "center", baseline: "middle" });

    label(M + 34, y + 1, "KOACHAPP", 8.5, C.ink, true, { charSpace: 1.2 });
    label(M + 34, y + 13, L.reportTitle, 8, C.ink3, false, { mono: true, charSpace: 0.4 });

    // right-aligned client + week + phase
    const rightX = PW - M;
    const week = `${dM(report.week_start)} – ${dM(report.week_end)}`;
    const phase = m.phase?.name ? `${week}  ·  ${m.phase.name}` : week;
    doc.setFont(FONT, "bold");
    doc.setFontSize(11);
    ink(C.ink);
    doc.text(clientName || "—", rightX, y + 1, { align: "right", baseline: "top" });
    doc.setFont(MONO, "normal");
    doc.setFontSize(7.4);
    ink(C.ink3);
    doc.text(phase.toUpperCase(), rightX, y + 15, { align: "right", baseline: "top", charSpace: 0.3 });

    y += 34;
    stroke(C.lime);
    doc.setLineWidth(1.4);
    doc.line(M, y, M + 26, y); // short lime rule
    stroke(C.border);
    doc.setLineWidth(0.75);
    doc.line(M + 30, y, PW - M, y);
    y += 16;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2. HERO — weight + change, and goal bar
  // ════════════════════════════════════════════════════════════════════════
  {
    const h = 78;
    ensure(h);
    card(M, y, CW, h);
    const padX = 16;
    // left: weight value + change
    micro(M + padX, y + 13, L.weight);
    const endW = m.weight.end;
    doc.setFont(FONT, "bold");
    doc.setFontSize(30);
    ink(C.ink);
    const wText = endW == null ? "—" : `${fmt(endW, 1)}`;
    doc.text(wText, M + padX, y + 30, { baseline: "top" });
    const wW = doc.getTextWidth(wText);
    doc.setFontSize(12);
    ink(C.ink3);
    doc.text("kg", M + padX + wW + 6, y + 44, { baseline: "top" });
    // change chip
    const ch = m.weight.changeKg;
    if (ch != null) {
      const col = ch <= 0 ? C.good : C.warn;
      const chTxt = `${ch > 0 ? "+" : ""}${fmt(ch, 1)} kg`;
      doc.setFont(MONO, "normal");
      doc.setFontSize(9);
      const cw = doc.getTextWidth(chTxt) + 16;
      const cx = M + padX + wW + 30;
      fill(C.surface2);
      doc.roundedRect(cx, y + 28, cw, 16, 8, 8, "F");
      ink(col);
      doc.text(chTxt, cx + 8, y + 36.5, { baseline: "middle" });
    }

    // right: goal bar start→now→target
    const gx = M + CW / 2 + 8;
    const gw = CW / 2 - 8 - padX;
    const s = m.weight.startWeightKg, now = m.weight.end, tgt = m.weight.targetWeightKg;
    if (s != null && now != null && tgt != null && s !== tgt) {
      const pct = Math.max(0, Math.min(1, (s - now) / (s - tgt)));
      micro(gx, y + 13, L.goalTarget);
      const barY = y + 40;
      fill(C.surface2);
      doc.roundedRect(gx, barY, gw, 6, 3, 3, "F");
      fill(C.lime);
      doc.roundedRect(gx, barY, Math.max(6, gw * pct), 6, 3, 3, "F");
      doc.setFont(MONO, "normal");
      doc.setFontSize(7.2);
      ink(C.ink3);
      doc.text(`${fmt(s, 1)}`, gx, barY - 9, { baseline: "bottom" });
      ink(C.lime);
      doc.text(`${fmt(now, 1)} kg`, gx + gw * pct, barY - 9, { baseline: "bottom", align: "center" });
      ink(C.ink3);
      doc.text(`${fmt(tgt, 1)}`, gx + gw, barY - 9, { baseline: "bottom", align: "right" });
      doc.text(`${Math.round(pct * 100)}%`, gx + gw, barY + 10, { baseline: "top", align: "right" });
    }
    y += h + GAP;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 3. KPI CHIPS row
  // ════════════════════════════════════════════════════════════════════════
  {
    const chips: { label: string; value: string; sub?: string }[] = [
      { label: L.daysLogged(m.daysLogged), value: `${m.daysLogged}/7` },
      { label: L.adherence, value: m.mealPlanAdherencePct == null ? "—" : `${m.mealPlanAdherencePct}%` },
      {
        label: L.sessions,
        value:
          m.training.sessionsPlanned != null
            ? `${m.training.sessionsDone}/${m.training.sessionsPlanned}`
            : `${m.training.sessionsDone}`,
      },
      { label: L.steps, value: m.steps.value == null ? "—" : nf.format(Math.round(m.steps.value)) },
    ];
    const h = 46;
    ensure(h);
    const cw = (CW - GAP * (chips.length - 1)) / chips.length;
    chips.forEach((c, i) => {
      const x = M + i * (cw + GAP);
      card(x, y, cw, h, 9);
      micro(x + 11, y + 11, c.label);
      label(x + 11, y + 22, c.value, 15, C.ink, true);
    });
    y += h + GAP;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 4. CHARTS — weight trend + calories trend (side by side)
  // ════════════════════════════════════════════════════════════════════════
  {
    const h = 116;
    const half = (CW - GAP) / 2;
    ensure(h);
    // weight trend
    const wPts = (m.trends?.weightByWeek ?? []).map((p) => ({ x: dM(p.weekStart), v: p.value }));
    // No target line here — the goal bar above already shows the target, and
    // including a far-off goal would squash the actual trend.
    drawLineChart(M, y, half, h, L.weightTrend, wPts, C.lime, null, true);
    // calories trend (daily)
    const cPts = m.daily.filter((d) => d.calories != null).map((d) => ({ x: dM(d.date), v: d.calories as number }));
    drawLineChart(M + half + GAP, y, half, h, L.caloriesTrend, cPts, C.carb, m.calories.target, false);
    y += h + GAP;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 5. MACROS bars
  // ════════════════════════════════════════════════════════════════════════
  {
    const rows = [
      { name: L.protein, v: m.protein.value, t: m.protein.target, c: C.blue },
      { name: L.carbs, v: m.carbs.value, t: m.carbs.target, c: C.carb },
      { name: L.fat, v: m.fat.value, t: m.fat.target, c: C.violet },
    ];
    const h = 30 + rows.length * 22 + 6;
    ensure(h);
    card(M, y, CW, h);
    micro(M + 14, y + 13, L.macros);
    let ry = y + 32;
    const barX = M + 14;
    const barW = CW - 28;
    rows.forEach((r) => {
      const pct = r.v != null && r.t ? Math.max(0, Math.min(1, r.v / r.t)) : 0;
      label(barX, ry, r.name, 9.5, C.ink2);
      const valTxt = `${r.v == null ? "—" : Math.round(r.v)}${r.t ? ` / ${r.t}` : ""} g`;
      doc.setFont(MONO, "normal");
      doc.setFontSize(8.4);
      ink(C.ink3);
      doc.text(valTxt, M + CW - 14, ry + 1, { baseline: "top", align: "right" });
      const trackY = ry + 14;
      fill(C.surface2);
      doc.roundedRect(barX, trackY, barW, 5, 2.5, 2.5, "F");
      fill(r.c);
      doc.roundedRect(barX, trackY, Math.max(3, barW * pct), 5, 2.5, 2.5, "F");
      ry += 22;
    });
    y += h + GAP;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 6. ADHERENCE dots + secondary stat chips
  // ════════════════════════════════════════════════════════════════════════
  {
    const h = 46;
    ensure(h);
    const half = (CW - GAP) / 2;
    // adherence 7-day dots
    card(M, y, half, h, 9);
    micro(M + 12, y + 11, L.adherence7d);
    {
      const dotR = 5;
      let dx = M + 12;
      const dy = y + 28;
      const days = m.daily.length ? m.daily : Array.from({ length: 7 }, () => ({ followedMealPlan: null }));
      days.forEach((d) => {
        fill((d as { followedMealPlan: boolean | null }).followedMealPlan ? C.good : C.surface2);
        doc.circle(dx + dotR, dy, dotR, "F");
        dx += dotR * 2 + 6;
      });
    }
    // secondary stats grid (sleep / energy / waist / body fat)
    const stats = [
      { l: L.sleep, v: m.sleepH.value == null ? "—" : `${fmt(m.sleepH.value, 1)} h` },
      { l: L.energy, v: m.energy.value == null ? "—" : fmt(m.energy.value, 1) },
      { l: L.waist, v: m.measurement?.waistCm == null ? "—" : `${fmt(m.measurement.waistCm, 1)}` },
      { l: L.bodyFat, v: m.measurement?.bodyFatPct == null ? "—" : `${fmt(m.measurement.bodyFatPct, 1)}%` },
    ];
    const sx = M + half + GAP;
    const sgap = 8;
    const sw = (half - sgap * 3) / 4;
    stats.forEach((st, i) => {
      const x = sx + i * (sw + sgap);
      card(x, y, sw, h, 9);
      micro(x + 8, y + 11, st.l);
      label(x + 8, y + 22, st.v, 12, C.ink, true);
    });
    y += h + GAP;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 7. PERSONAL BESTS
  // ════════════════════════════════════════════════════════════════════════
  if (m.training.personalBests.length) {
    const pbs = m.training.personalBests.slice(0, 6);
    const h = 28 + Math.ceil(pbs.length / 2) * 18 + 6;
    ensure(h);
    card(M, y, CW, h);
    micro(M + 14, y + 13, L.personalBests, C.lime);
    let py = y + 30;
    const colW = (CW - 28) / 2;
    pbs.forEach((pb, i) => {
      const col = i % 2;
      const x = M + 14 + col * colW;
      if (col === 0 && i > 0) py += 18;
      doc.setFont(FONT, "normal");
      doc.setFontSize(9.5);
      ink(C.ink2);
      doc.text(`${pb.exercise}`, x, py, { baseline: "top" });
      doc.setFont(FONT, "bold");
      ink(C.ink);
      doc.text(`${fmt(pb.weightKg, 1)} kg × ${pb.reps}`, x + colW - 14, py, { baseline: "top", align: "right" });
    });
    y += h + GAP;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 8. SUMMARY (AI client narrative)
  // ════════════════════════════════════════════════════════════════════════
  if (report.client_summary && report.client_summary.trim()) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(9.8);
    const lines = doc.splitTextToSize(report.client_summary.trim(), CW - 28) as string[];
    const h = 30 + lines.length * 13 + 8;
    ensure(Math.min(h, PH - M - FOOTER_H)); // keep header with at least some lines
    card(M, y, CW, h, 10, C.card2);
    micro(M + 14, y + 13, L.summary, C.lime);
    ink(C.ink2);
    doc.setFont(FONT, "normal");
    doc.setFontSize(9.8);
    doc.text(lines, M + 14, y + 30, { baseline: "top" });
    y += h + GAP;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 9. COACH RECOMMENDATIONS
  // ════════════════════════════════════════════════════════════════════════
  {
    const recs = [
      { label: L.recTraining, text: report.rec_training },
      { label: L.recNutrition, text: report.rec_nutrition },
      { label: L.recGeneral, text: report.rec_general },
    ].filter((r) => r.text && r.text.trim());
    if (recs.length) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(9.3);
      const blocks = recs.map((r) => ({
        label: r.label,
        lines: doc.splitTextToSize((r.text as string).trim(), CW - 28) as string[],
      }));
      const innerH = blocks.reduce((s, b) => s + 12 + b.lines.length * 12 + 9, 0);
      const h = 32 + innerH;
      ensure(h);
      card(M, y, CW, h, 10, "#10130C", "#2C3A12");
      micro(M + 14, y + 14, L.recommendations, C.lime);
      let ry = y + 33;
      blocks.forEach((b) => {
        doc.setFont(MONO, "normal");
        doc.setFontSize(6.6);
        ink(C.lime);
        doc.text(b.label.toUpperCase(), M + 14, ry, { baseline: "top", charSpace: 0.4 });
        ry += 12;
        doc.setFont(FONT, "normal");
        doc.setFontSize(9.3);
        ink(C.ink);
        doc.text(b.lines, M + 14, ry, { baseline: "top" });
        ry += b.lines.length * 12 + 9;
      });
      y += h + GAP;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // FOOTERS (all pages)
  // ════════════════════════════════════════════════════════════════════════
  const total = doc.getNumberOfPages();
  const genDate = new Date(report.generated_at).toLocaleDateString(locale === "hr" ? "hr-HR" : "en-US");
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    stroke(C.border);
    doc.setLineWidth(0.75);
    doc.line(M, PH - FOOTER_H, PW - M, PH - FOOTER_H);
    doc.setFont(MONO, "normal");
    doc.setFontSize(7);
    ink(C.ink3);
    doc.text(L.generatedOn(genDate).toUpperCase(), M, PH - FOOTER_H + 9, { baseline: "top", charSpace: 0.3 });
    doc.text("KOACHAPP", PW / 2, PH - FOOTER_H + 9, { baseline: "top", align: "center", charSpace: 1 });
    doc.text(`${p} / ${total}`, PW - M, PH - FOOTER_H + 9, { baseline: "top", align: "right" });
  }

  return doc;

  // ── nested: native line/area chart ─────────────────────────────────────
  function drawLineChart(
    x: number,
    yTop: number,
    w: number,
    h: number,
    title: string,
    pts: { x: string; v: number }[],
    color: string,
    target: number | null,
    area: boolean,
  ) {
    card(x, yTop, w, h, 10);
    micro(x + 12, yTop + 12, title);
    const plotX = x + 12;
    const plotY = yTop + 32;
    const plotW = w - 24;
    const plotH = h - 32 - 18;
    if (pts.length < 2) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(8.5);
      ink(C.ink4);
      doc.text("—", x + w / 2, plotY + plotH / 2, { align: "center", baseline: "middle" });
      return;
    }
    const vals = pts.map((p) => p.v);
    let lo = Math.min(...vals, ...(target != null ? [target] : []));
    let hi = Math.max(...vals, ...(target != null ? [target] : []));
    if (lo === hi) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.12;
    lo -= pad; hi += pad;
    const sx = (i: number) => plotX + (plotW * i) / (pts.length - 1);
    const sy = (v: number) => plotY + plotH - (plotH * (v - lo)) / (hi - lo);

    // baseline grid
    stroke(C.border);
    doc.setLineWidth(0.5);
    doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);

    // target dashed line
    if (target != null) {
      stroke(C.ink4);
      doc.setLineWidth(0.6);
      const ty = sy(target);
      // manual dashes
      for (let dx = plotX; dx < plotX + plotW; dx += 7) {
        doc.line(dx, ty, Math.min(dx + 4, plotX + plotW), ty);
      }
    }

    // area fill (subtle)
    if (area) {
      fill(color);
      doc.setGState(new GState({ opacity: 0.12 }));
      // polygon: along points then back along baseline
      const xs = pts.map((_, i) => sx(i));
      const ys = pts.map((p) => sy(p.v));
      // jsPDF lines() needs relative segments; build a path
      const segs: [number, number][] = [];
      for (let i = 1; i < pts.length; i++) segs.push([xs[i] - xs[i - 1], ys[i] - ys[i - 1]]);
      segs.push([0, plotY + plotH - ys[ys.length - 1]]);
      segs.push([-(xs[xs.length - 1] - xs[0]), 0]);
      doc.lines(segs, xs[0], ys[0], [1, 1], "F", true);
      doc.setGState(new GState({ opacity: 1 }));
    }

    // line
    stroke(color);
    doc.setLineWidth(1.6);
    for (let i = 1; i < pts.length; i++) {
      doc.line(sx(i - 1), sy(pts[i - 1].v), sx(i), sy(pts[i].v));
    }
    // end dot
    fill(color);
    doc.circle(sx(pts.length - 1), sy(pts[pts.length - 1].v), 2.4, "F");

    // labels: real data max (top-left), x range (bottom)
    const dMax = Math.max(...vals);
    doc.setFont(MONO, "normal");
    doc.setFontSize(6.2);
    ink(C.ink3);
    doc.text(nf.format(Math.round(dMax)), plotX, plotY - 1, { baseline: "bottom" });
    doc.text(pts[0].x, plotX, plotY + plotH + 4, { baseline: "top" });
    doc.text(pts[pts.length - 1].x, plotX + plotW, plotY + plotH + 4, { baseline: "top", align: "right" });
  }
}
