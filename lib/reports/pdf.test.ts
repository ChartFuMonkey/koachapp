import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildReportPdf, type PdfLabels } from "./pdf";
import type { WeeklyReportRow } from "./types";

const fonts = {
  regular: new Uint8Array(readFileSync("public/fonts/IBMPlexSans-Regular.ttf")),
  semibold: new Uint8Array(readFileSync("public/fonts/IBMPlexSans-SemiBold.ttf")),
  mono: new Uint8Array(readFileSync("public/fonts/IBMPlexMono-Regular.ttf")),
};

const labels: PdfLabels = {
  reportTitle: "Tjedni izvještaj",
  draft: "Skica",
  weight: "Težina",
  calories: "Kalorije",
  protein: "Proteini",
  carbs: "Ugljikohidrati",
  fat: "Masti",
  steps: "Koraci",
  sleep: "San",
  energy: "Energija",
  adherence: "Plan prehrane",
  training: "Trening",
  volume: "Volumen",
  vsTarget: "cilj",
  daysLogged: () => `Dana uneseno`,
  sessions: "Treninzi",
  sectionNutrition: "Prehrana",
  sectionTraining: "Trening",
  sectionProgress: "Napredak",
  weightTrend: "Trend težine",
  caloriesTrend: "Kalorije / dan",
  macros: "Makronutrijenti vs cilj",
  waist: "Struk",
  bodyFat: "Masno tkivo",
  goalStart: "Početak",
  goalNow: "Sada",
  goalTarget: "Cilj",
  adherence7d: "Dani na planu",
  personalBests: "Osobni rekordi",
  summary: "Sažetak za klijenta",
  recommendations: "Preporuke trenera",
  recTraining: "Trening",
  recNutrition: "Prehrana",
  recGeneral: "Općenito",
  generatedOn: (d) => `Generirano ${d}`,
};

const days = ["2026-05-25", "2026-05-26", "2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30", "2026-05-31"];
const cal = [2280, 2310, 2260, 2330, 2295, 2270, 2305];
const stp = [10200, 11800, 9400, 12100, 9900, 10700, 10700];
const wt = [86.2, 86.0, 85.8, 85.6, 85.5, 85.3, 85.2];

const report = {
  id: "demo",
  client_id: "c1",
  coach_id: "x",
  week_start: "2026-05-25",
  week_end: "2026-05-31",
  status: "draft",
  language: "hr",
  generated_at: "2026-06-01T08:00:00Z",
  client_summary:
    "Marko, ovo je bila iznimna tjedan – svaki dan si bio prijavljen, 100% pratio plan prehrane i odradio sve 4 planirane treninge. Težina ti je pala s 86,2 na 85,2 kg (–1 kg), struk se smanjio s 92 na 90,5 cm, a postotak masnog tkiva s 18,5% na 17,2%. Uz to, prosječan broj koraka (10.685) bio je iznad cilja (9.000), spavaš bolje nego prošlog tjedna (7,7 h) i energija ti je bila na visokih 8,4/10. Na treninzima si postavio osobne rekorde na čak 5 vježbi. Bravo – to je tjedan koji treba biti standard!",
  rec_training: "Zadrži isti raspored 4 treninga. Dodaj jednu kratku cardio sesiju (20–25 min) u nedjelju.",
  rec_nutrition: "Nastavi s istim unosom. Probaj malo povećati proteine na doručku (+20 g).",
  rec_general: "Odličan tjedan. Fokus sljedeći tjedan: san prije ponoći svaki dan.",
  flags: [],
  metrics: {
    daysLogged: 7,
    weight: { start: 86.2, end: 85.2, avg: 85.7, changeKg: -1, startWeightKg: 92, targetWeightKg: 80 },
    calories: { value: 2293, prev: 2310, target: 2300 },
    protein: { value: 198.1, prev: 187.6, target: 195 },
    carbs: { value: 204.7, prev: 220, target: 210 },
    fat: { value: 62.4, prev: 68, target: 65 },
    steps: { value: 10685, prev: 9800, target: 9000 },
    sleepH: { value: 7.7, prev: 7.1, target: 8 },
    sleepQuality: { value: 7, prev: 6, target: null },
    energy: { value: 8.4, prev: 7.2, target: null },
    waterL: { value: 3.1, prev: 2.8, target: 3 },
    cardioMin: 0,
    mealPlanAdherencePct: 100,
    training: {
      sessionsDone: 4,
      sessionsPlanned: 4,
      totalVolumeKg: 18450,
      totalDurationMin: 268,
      personalBests: [
        { exercise: "Potisak s klupe", weightKg: 85, reps: 5 },
        { exercise: "Overhead Press", weightKg: 55, reps: 5 },
        { exercise: "Čučanj", weightKg: 117.5, reps: 5 },
        { exercise: "Rumunjsko mrtvo dizanje", weightKg: 142.5, reps: 5 },
        { exercise: "Facepull", weightKg: 27.5, reps: 15 },
      ],
    },
    measurement: { waistCm: 90.5, waistPrevCm: 92, bodyFatPct: 17.2, bodyFatPrevPct: 18.5 },
    checkin: null,
    phase: { name: "Mršavljenje · Blok 1", type: "cut", targetKcal: 2300 },
    daily: days.map((date, i) => ({ date, weightKg: wt[i], calories: cal[i], steps: stp[i], followedMealPlan: true })),
    trends: {
      weightByWeek: [
        { weekStart: "2026-04-20", value: 88.4 },
        { weekStart: "2026-04-27", value: 87.9 },
        { weekStart: "2026-05-04", value: 87.6 },
        { weekStart: "2026-05-11", value: 86.9 },
        { weekStart: "2026-05-18", value: 86.6 },
        { weekStart: "2026-05-25", value: 85.7 },
      ],
      measurements: [
        { date: "2026-05-04", waistCm: 93, bodyFatPct: 19.1 },
        { date: "2026-05-18", waistCm: 92, bodyFatPct: 18.5 },
        { date: "2026-05-31", waistCm: 90.5, bodyFatPct: 17.2 },
      ],
      strength: [
        { exercise: "Bench", points: [{ weekStart: "2026-05-11", value: 80 }, { weekStart: "2026-05-25", value: 85 }] },
        { exercise: "Squat", points: [{ weekStart: "2026-05-11", value: 110 }, { weekStart: "2026-05-25", value: 117.5 }] },
      ],
    },
  },
} as unknown as WeeklyReportRow;

describe("buildReportPdf", () => {
  it("renders a multi-element dark report and writes a sample to inspect", () => {
    const doc = buildReportPdf({ report, locale: "hr", clientName: "Marko Horvat", labels, fonts });
    const buf = Buffer.from(doc.output("arraybuffer"));
    writeFileSync(join(tmpdir(), "koachapp-sample-report.pdf"), buf);
    expect(buf.length).toBeGreaterThan(5000);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
