// lib/reports/types.ts
// Shared types for weekly report generation + rendering.

export type ReportStatus = "draft" | "published";
export type ReportLanguage = "hr" | "en";

/** A metric with this-week value, previous-week value, and optional target. */
export type MetricPair = {
  value: number | null;
  prev: number | null;
  target: number | null;
};

export type PersonalBest = {
  exercise: string;
  weightKg: number;
  reps: number;
};

export type DailyPoint = {
  date: string; // YYYY-MM-DD
  weightKg: number | null;
  calories: number | null;
  steps: number | null;
  followedMealPlan: boolean | null;
};

export type TrendPoint = { weekStart: string; value: number };

export type Trends = {
  weightByWeek: TrendPoint[];
  measurements: Array<{ date: string; waistCm: number | null; bodyFatPct: number | null }>;
  strength: Array<{ exercise: string; points: TrendPoint[] }>;
};

export type CheckinEcho = {
  overall: number | null;
  energy: number | null;
  stress: number | null;
  motivation: number | null;
  appetite: number | null;
  adherenceDietPct: number | null;
  adherenceTraining: boolean | null;
  whatWentWell: string | null;
  challenges: string | null;
  goalsNextWeek: string | null;
  questionsForCoach: string | null;
};

export type PhaseInfo = {
  name: string | null;
  type: string | null;
  targetKcal: number | null;
};

export type WeeklyMetrics = {
  daysLogged: number;
  weight: {
    start: number | null;
    end: number | null;
    avg: number | null;
    changeKg: number | null;
    startWeightKg: number | null;
    targetWeightKg: number | null;
  };
  calories: MetricPair;
  protein: MetricPair;
  carbs: MetricPair;
  fat: MetricPair;
  steps: MetricPair;
  sleepH: MetricPair;
  sleepQuality: MetricPair;
  energy: MetricPair;
  waterL: MetricPair;
  cardioMin: number;
  mealPlanAdherencePct: number | null;
  training: {
    sessionsDone: number;
    sessionsPlanned: number | null;
    totalVolumeKg: number | null;
    totalDurationMin: number;
    personalBests: PersonalBest[];
  };
  measurement: {
    waistCm: number | null;
    waistPrevCm: number | null;
    bodyFatPct: number | null;
    bodyFatPrevPct: number | null;
  } | null;
  checkin: CheckinEcho | null;
  phase: PhaseInfo | null;
  daily: DailyPoint[];
  trends: Trends;
};

export type FlagSeverity = "info" | "warn" | "danger";
export type Flag = {
  key: string;
  severity: FlagSeverity;
  text_hr: string;
  text_en: string;
};

export type AiSummaries = {
  client_summary: string;
  coach_summary: string;
};

/** Shape of a `weekly_reports` row as read back from Supabase. */
export type WeeklyReportRow = {
  id: string;
  client_id: string;
  coach_id: string;
  week_start: string;
  week_end: string;
  status: ReportStatus;
  language: ReportLanguage;
  metrics: WeeklyMetrics;
  flags: Flag[];
  client_summary: string | null;
  coach_summary: string | null;
  coach_note: string | null;
  rec_training: string | null;
  rec_nutrition: string | null;
  rec_general: string | null;
  ai_model: string | null;
  ai_generated_at: string | null;
  generated_at: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};
