import { DateTime } from "luxon";

import { applyBreaksToIntervals, intervalsOverlap } from "@/lib/booking/intervals";
import type { Service, Staff, WorkingHours } from "@/lib/types";

const WEEKDAY_TO_KEY: Record<number, keyof WorkingHours> = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
  7: "sunday",
};

function parseHm(t: string): { h: number; m: number } {
  const [a, b] = t.split(":").map((x) => parseInt(x, 10));
  return { h: a, m: b };
}

export type ExistingAppointmentRange = { startMs: number; endMs: number };

export type BuildSlotsInput = {
  timezone: string;
  commerceWorkingHours: WorkingHours;
  staffWorkingHours?: WorkingHours;
  slotDurationMinutes: number;
  serviceDurationMinutes: number;
  dateStr: string;
  minHoursBeforeBooking: number;
  maxDaysInAdvance: number;
  nowUtc: Date;
  existing: ExistingAppointmentRange[];
};

/**
 * Devuelve instantes UTC (epoch ms) de inicio de cada turno disponible.
 */
export function buildAvailableSlotStartsUtc(input: BuildSlotsInput): number[] {
  const {
    timezone,
    commerceWorkingHours,
    staffWorkingHours,
    slotDurationMinutes,
    serviceDurationMinutes,
    dateStr,
    minHoursBeforeBooking,
    maxDaysInAdvance,
    nowUtc,
    existing,
  } = input;

  const wh = staffWorkingHours ?? commerceWorkingHours;

  const selectedDay = DateTime.fromISO(dateStr, { zone: timezone });
  if (!selectedDay.isValid) return [];

  const todayZ = DateTime.fromJSDate(nowUtc, { zone: timezone }).startOf("day");
  const selStart = selectedDay.startOf("day");
  if (selStart < todayZ) return [];
  if (selStart > todayZ.plus({ days: maxDaysInAdvance })) return [];

  const key = WEEKDAY_TO_KEY[selectedDay.weekday];
  const sched = wh[key];
  if (!sched?.enabled) return [];

  const { h: sh, m: sm } = parseHm(sched.start);
  const { h: eh, m: em } = parseHm(sched.end);
  const dayBase = selectedDay.startOf("day");
  let open = dayBase.set({
    hour: sh,
    minute: sm,
    second: 0,
    millisecond: 0,
  });
  let close = dayBase.set({
    hour: eh,
    minute: em,
    second: 0,
    millisecond: 0,
  });
  if (close <= open) return [];

  let intervals = [{ start: open, end: close }];
  intervals = applyBreaksToIntervals(intervals, sched.breaks, dayBase);

  const minStartMs =
    nowUtc.getTime() + minHoursBeforeBooking * 60 * 60 * 1000;

  const step = slotDurationMinutes;
  const dur = serviceDurationMinutes;
  const slots: number[] = [];

  for (const iv of intervals) {
    let t = iv.start;
    while (true) {
      const slotEnd = t.plus({ minutes: dur });
      if (slotEnd > iv.end) break;

      const startUtcMs = t.toUTC().toMillis();
      const endUtcMs = slotEnd.toUTC().toMillis();

      if (startUtcMs >= minStartMs) {
        let clash = false;
        for (const ex of existing) {
          if (intervalsOverlap(startUtcMs, endUtcMs, ex.startMs, ex.endMs)) {
            clash = true;
            break;
          }
        }
        if (!clash) slots.push(startUtcMs);
      }

      t = t.plus({ minutes: step });
    }
  }

  return slots.sort((a, b) => a - b);
}

export function assertSlotAllowedForStaffService(
  staff: Staff,
  service: Service
): boolean {
  if (!staff.active || !service.active) return false;
  return staff.servicesIds.includes(service.id);
}
