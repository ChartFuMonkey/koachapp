import type { Locale } from "@/i18n/request";

/**
 * Locale-aware display name for an exercise.
 *
 * Pre-seeded exercises carry an English translation in `name_en`. Coach-created
 * exercises are authored in whatever language the coach typed, so `name_en` is
 * NULL for those — in that case we fall back to `name` regardless of locale.
 */
export function exerciseDisplayName(
  exercise: { name: string; name_en?: string | null },
  locale: Locale
): string {
  if (locale === "en" && exercise.name_en) return exercise.name_en;
  return exercise.name;
}

/**
 * Locale-aware setup notes for an exercise. Falls back to `notes` (the language
 * the coach typed) when there is no English translation.
 */
export function exerciseNotes(
  exercise: { notes?: string | null; notes_en?: string | null },
  locale: Locale
): string | null {
  if (locale === "en" && exercise.notes_en) return exercise.notes_en;
  return exercise.notes ?? null;
}
