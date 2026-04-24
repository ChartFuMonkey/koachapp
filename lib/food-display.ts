import type { Locale } from "@/i18n/request";

/**
 * Locale-aware display name for a food.
 *
 * Pre-seeded foods carry an English translation in `name_en`. Coach-created
 * foods are authored in whatever language the coach typed, so `name_en` is
 * NULL for those — in that case we fall back to `name` regardless of locale.
 */
export function foodDisplayName(
  food: { name: string; name_en: string | null },
  locale: Locale
): string {
  if (locale === "en" && food.name_en) return food.name_en;
  return food.name;
}
