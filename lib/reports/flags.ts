// lib/reports/flags.ts
// Pure, rule-based concern flags. Deterministic (not AI) so they're reliable.

import type { WeeklyMetrics, Flag } from "./types";

export function computeFlags(m: WeeklyMetrics): Flag[] {
  const flags: Flag[] = [];

  if (m.daysLogged < 4) {
    flags.push({
      key: "low_logging",
      severity: m.daysLogged <= 1 ? "danger" : "warn",
      text_hr: `Samo ${m.daysLogged} od 7 dana uneseno`,
      text_en: `Only ${m.daysLogged} of 7 days logged`,
    });
  }

  if (m.training.sessionsDone === 0) {
    flags.push({
      key: "missed_training",
      severity: "warn",
      text_hr: "Nijedan trening nije zabilježen ovaj tjedan",
      text_en: "No workouts logged this week",
    });
  }

  if (
    m.sleepH.value != null &&
    m.sleepH.target != null &&
    m.sleepH.value < m.sleepH.target - 1
  ) {
    flags.push({
      key: "sleep_low",
      severity: "warn",
      text_hr: `Prosječan san ${m.sleepH.value} h (cilj ${m.sleepH.target} h)`,
      text_en: `Avg sleep ${m.sleepH.value}h (target ${m.sleepH.target}h)`,
    });
  }

  if (m.calories.value != null && m.calories.target) {
    const diffPct =
      Math.abs(m.calories.value - m.calories.target) / m.calories.target;
    if (diffPct > 0.2) {
      flags.push({
        key: "calories_off_target",
        severity: "info",
        text_hr: `Kalorije ${Math.round(m.calories.value)} vs cilj ${m.calories.target}`,
        text_en: `Calories ${Math.round(m.calories.value)} vs target ${m.calories.target}`,
      });
    }
  }

  if (
    m.phase &&
    (m.phase.type === "fat_loss" || m.phase.type === "muscle_gain") &&
    m.weight.changeKg != null &&
    Math.abs(m.weight.changeKg) < 0.2
  ) {
    flags.push({
      key: "weight_stalled",
      severity: "info",
      text_hr: "Težina stagnira ovaj tjedan",
      text_en: "Weight is stalled this week",
    });
  }

  if (m.checkin?.questionsForCoach && m.checkin.questionsForCoach.trim()) {
    flags.push({
      key: "open_question",
      severity: "info",
      text_hr: "Klijent ima pitanje za trenera",
      text_en: "Client left a question for the coach",
    });
  }

  return flags;
}
