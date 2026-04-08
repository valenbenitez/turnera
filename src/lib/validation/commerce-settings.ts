import type { DayOfWeek, DaySchedule, WorkingHours } from "@/lib/types";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const COMMERCE_TIMEZONE_MAX_LEN = 80;

const DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function isValidTimeHHmm(value: string): boolean {
  return TIME_RE.test(value.trim());
}

/** Normaliza horas tipo `9:5` → `09:05` para validar y guardar. */
export function padTimeHHmm(s: string): string {
  const t = s.trim();
  const m = t.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return t;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return t;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Valida IANA u otra zona aceptada por el motor (Intl). */
export function isValidTimezoneIANA(tz: string): boolean {
  const t = tz.trim();
  if (t.length < 2 || t.length > COMMERCE_TIMEZONE_MAX_LEN) return false;
  if (!/^[A-Za-z0-9_/+-]+$/.test(t)) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: t }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function sanitizeWhatsappNumber(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (s.length === 0) return null;
  if (s.length > 32) return null;
  if (!/^\+?[0-9][0-9\s-]{6,30}$/.test(s)) return null;
  return s.replace(/\s+/g, "").replace(/-/g, "");
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseDaySchedule(raw: unknown): DaySchedule | null {
  if (!isPlainObject(raw)) return null;
  const enabled = raw.enabled;
  if (typeof enabled !== "boolean") return null;
  const start = padTimeHHmm(
    typeof raw.start === "string" ? raw.start.trim() : ""
  );
  const end = padTimeHHmm(typeof raw.end === "string" ? raw.end.trim() : "");
  if (enabled) {
    if (!isValidTimeHHmm(start) || !isValidTimeHHmm(end)) return null;
    if (start >= end) return null;
  } else {
    if (start && !isValidTimeHHmm(start)) return null;
    if (end && !isValidTimeHHmm(end)) return null;
  }
  const breaks: { start: string; end: string }[] = [];
  if (Array.isArray(raw.breaks)) {
    for (const b of raw.breaks) {
      if (!isPlainObject(b)) return null;
      const bs = padTimeHHmm(typeof b.start === "string" ? b.start.trim() : "");
      const be = padTimeHHmm(typeof b.end === "string" ? b.end.trim() : "");
      if (!isValidTimeHHmm(bs) || !isValidTimeHHmm(be) || bs >= be) return null;
      breaks.push({ start: bs, end: be });
    }
  }
  return {
    enabled,
    start: start || "09:00",
    end: end || "18:00",
    breaks: breaks.length ? breaks : undefined,
  };
}

export function parseWorkingHours(raw: unknown): WorkingHours | null {
  if (!isPlainObject(raw)) return null;
  const out = {} as WorkingHours;
  for (const day of DAYS) {
    const d = parseDaySchedule(raw[day]);
    if (!d) return null;
    out[day] = d;
  }
  return out;
}

