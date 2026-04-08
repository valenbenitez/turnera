import { DateTime } from "luxon";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` válido como calendario (no valida día del mes). */
export function isValidAgendaDateParam(dateStr: string): boolean {
  return DATE_RE.test(dateStr);
}

/**
 * Límites UTC del día calendario en la zona del comercio (inicio local 00:00,
 * fin exclusivo al día siguiente 00:00 local).
 */
export function agendaDayUtcBounds(
  dateStr: string,
  timezone: string
): { fromUtc: Date; toExclusiveUtc: Date } | null {
  if (!DATE_RE.test(dateStr)) return null;
  const localDay = DateTime.fromFormat(dateStr, "yyyy-MM-dd", { zone: timezone });
  if (!localDay.isValid) return null;
  const start = localDay.startOf("day");
  const endExclusive = start.plus({ days: 1 });
  return {
    fromUtc: start.toUTC().toJSDate(),
    toExclusiveUtc: endExclusive.toUTC().toJSDate(),
  };
}
