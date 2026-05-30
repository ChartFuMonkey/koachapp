// lib/reports/week.ts
// Pure week-boundary helpers over YYYY-MM-DD strings (Europe/Zagreb calendar
// dates). Uses noon-UTC anchors so ±day arithmetic never crosses a date line.

/** ISO day-of-week for a YYYY-MM-DD date: 1=Mon ... 7=Sun. */
export function isoDow(dateStr: string): number {
  const js = new Date(dateStr + "T12:00:00Z").getUTCDay(); // 0=Sun..6=Sat
  return js === 0 ? 7 : js;
}

/** Add n days to a YYYY-MM-DD date, returning YYYY-MM-DD. */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday (start) and Sunday (end) of the ISO week containing dateStr. */
export function weekBounds(dateStr: string): {
  weekStart: string;
  weekEnd: string;
} {
  const weekStart = addDays(dateStr, -(isoDow(dateStr) - 1));
  return { weekStart, weekEnd: addDays(weekStart, 6) };
}

/** Monday of the week before the given week start. */
export function previousWeekStart(weekStart: string): string {
  return addDays(weekStart, -7);
}
