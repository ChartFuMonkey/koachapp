/**
 * Returns today's date in YYYY-MM-DD format in the Europe/Zagreb timezone.
 * Prevents off-by-one date bugs for Croatian users logging near midnight.
 */
export function todayCET(): string {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "Europe/Zagreb",
  });
}
