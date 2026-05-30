/**
 * Status colors by metric direction per Design Guidelines §20.
 *
 * Body weight Δ direction depends on phase intent:
 *   - CUT  → down = good, up = warn
 *   - BULK → up   = good, down = warn
 *   - MAINT/RECOMP → near-zero = good, large swings = warn
 *
 * Adherence, sleep quality, motivation, etc.: up = good, down = warn.
 *
 * RPE: 7-8 neutral, ≥9 sustained = warn.
 *
 * Last-log freshness: <24h good, 24–72h warn, >72h danger.
 */

export type Phase = "cut" | "bulk" | "maint" | "recomp" | null | undefined;

export type Tone = "good" | "warn" | "danger" | "neutral";

export function normalizePhase(name: string | null | undefined): Phase {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("cut") || n.includes("def") || n.includes("fat")) return "cut";
  if (n.includes("bulk") || n.includes("surplus") || n.includes("gain"))
    return "bulk";
  if (n.includes("recomp")) return "recomp";
  if (n.includes("maint")) return "maint";
  return null;
}

export function weightDeltaTone(delta: number | null, phase: Phase): Tone {
  if (delta == null) return "neutral";
  const abs = Math.abs(delta);
  if (phase === "cut") {
    if (delta < 0) return "good";
    if (delta > 0) return "warn";
    return "neutral";
  }
  if (phase === "bulk") {
    if (delta > 0) return "good";
    if (delta < 0) return "warn";
    return "neutral";
  }
  // Maint / recomp: small swings expected, larger ones flagged
  if (abs <= 0.3) return "good";
  if (abs <= 0.8) return "neutral";
  return "warn";
}

export function adherenceTone(pct: number | null): Tone {
  if (pct == null) return "neutral";
  if (pct >= 80) return "good";
  if (pct >= 60) return "warn";
  return "danger";
}

export function rpeTone(rpe: number | null): Tone {
  if (rpe == null) return "neutral";
  if (rpe >= 9) return "warn";
  if (rpe >= 7 && rpe <= 8) return "good";
  return "neutral";
}

/** Hours since the most recent log */
export function freshnessTone(hoursSince: number | null): Tone {
  if (hoursSince == null) return "danger";
  if (hoursSince < 24) return "good";
  if (hoursSince < 72) return "warn";
  return "danger";
}

export function toneToColorVar(tone: Tone): string {
  switch (tone) {
    case "good":
      return "var(--good)";
    case "warn":
      return "var(--warn)";
    case "danger":
      return "var(--danger)";
    default:
      return "var(--ink-3)";
  }
}

export function toneArrow(delta: number | null): string {
  if (delta == null || delta === 0) return "—";
  return delta > 0 ? "↑" : "↓";
}
