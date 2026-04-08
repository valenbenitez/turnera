import { describe, expect, it } from "vitest";

import { createDefaultWorkingHours } from "@/lib/commerce-defaults";

import { buildAvailableSlotStartsUtc } from "./slots";

describe("buildAvailableSlotStartsUtc", () => {
  it("genera slots en un día laborable", () => {
    const nowUtc = new Date("2025-06-10T12:00:00.000Z");
    const slots = buildAvailableSlotStartsUtc({
      timezone: "America/Argentina/Buenos_Aires",
      commerceWorkingHours: createDefaultWorkingHours(),
      slotDurationMinutes: 30,
      serviceDurationMinutes: 30,
      dateStr: "2025-06-11",
      minHoursBeforeBooking: 2,
      maxDaysInAdvance: 30,
      nowUtc,
      existing: [],
    });
    expect(slots.length).toBeGreaterThan(0);
    const first = slots[0];
    expect(typeof first).toBe("number");
  });

  it("no devuelve slots si el día está cerrado", () => {
    const wh = createDefaultWorkingHours();
    const closed = {
      ...wh,
      wednesday: { enabled: false, start: "09:00", end: "18:00", breaks: [] },
    };
    const nowUtc = new Date("2025-06-10T12:00:00.000Z");
    const slots = buildAvailableSlotStartsUtc({
      timezone: "America/Argentina/Buenos_Aires",
      commerceWorkingHours: closed,
      slotDurationMinutes: 30,
      serviceDurationMinutes: 30,
      dateStr: "2025-06-11",
      minHoursBeforeBooking: 0,
      maxDaysInAdvance: 30,
      nowUtc,
      existing: [],
    });
    expect(slots).toEqual([]);
  });

  it("respeta solape con turnos existentes", () => {
    const nowUtc = new Date("2025-06-10T12:00:00.000Z");
    const open = buildAvailableSlotStartsUtc({
      timezone: "America/Argentina/Buenos_Aires",
      commerceWorkingHours: createDefaultWorkingHours(),
      slotDurationMinutes: 30,
      serviceDurationMinutes: 30,
      dateStr: "2025-06-11",
      minHoursBeforeBooking: 0,
      maxDaysInAdvance: 30,
      nowUtc,
      existing: [],
    });
    expect(open.length).toBeGreaterThan(0);
    const blockedStart = open[0];
    const blockedEnd = blockedStart + 30 * 60 * 1000;
    const again = buildAvailableSlotStartsUtc({
      timezone: "America/Argentina/Buenos_Aires",
      commerceWorkingHours: createDefaultWorkingHours(),
      slotDurationMinutes: 30,
      serviceDurationMinutes: 30,
      dateStr: "2025-06-11",
      minHoursBeforeBooking: 0,
      maxDaysInAdvance: 30,
      nowUtc,
      existing: [{ startMs: blockedStart, endMs: blockedEnd }],
    });
    expect(again.includes(blockedStart)).toBe(false);
  });
});
