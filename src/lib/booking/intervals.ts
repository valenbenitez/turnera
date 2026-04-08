import { DateTime } from "luxon";

export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Recorta intervalo [a,b) quitando [bs,be) superpuesto. */
export function subtractInterval(
  a: DateTime,
  b: DateTime,
  bs: DateTime,
  be: DateTime
): { start: DateTime; end: DateTime }[] {
  if (be <= a || bs >= b) {
    return [{ start: a, end: b }];
  }
  const out: { start: DateTime; end: DateTime }[] = [];
  if (bs > a) {
    const leftEnd = bs < b ? bs : b;
    if (leftEnd > a) out.push({ start: a, end: leftEnd });
  }
  if (be < b) {
    const rightStart = be > a ? be : a;
    if (rightStart < b) out.push({ start: rightStart, end: b });
  }
  return out.filter((x) => x.end > x.start);
}

export function applyBreaksToIntervals(
  intervals: { start: DateTime; end: DateTime }[],
  breaks: { start: string; end: string }[] | undefined,
  dayBase: DateTime
): { start: DateTime; end: DateTime }[] {
  if (!breaks?.length) return intervals;
  let current = intervals;
  for (const br of breaks) {
    const [sh, sm] = br.start.split(":").map((x) => parseInt(x, 10));
    const [eh, em] = br.end.split(":").map((x) => parseInt(x, 10));
    const bs = dayBase.set({
      hour: sh,
      minute: sm,
      second: 0,
      millisecond: 0,
    });
    const be = dayBase.set({
      hour: eh,
      minute: em,
      second: 0,
      millisecond: 0,
    });
    const next: { start: DateTime; end: DateTime }[] = [];
    for (const iv of current) {
      next.push(...subtractInterval(iv.start, iv.end, bs, be));
    }
    current = next;
  }
  return current;
}
