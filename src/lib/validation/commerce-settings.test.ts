import { describe, expect, it } from "vitest";

import {
  isValidTimeHHmm,
  isValidTimezoneIANA,
  padTimeHHmm,
  parseDaySchedule,
  parseWorkingHours,
  sanitizeWhatsappNumber,
} from "./commerce-settings";

describe("commerce-settings", () => {
  it("padTimeHHmm normaliza horas", () => {
    expect(padTimeHHmm("9:5")).toBe("09:05");
    expect(padTimeHHmm("09:30")).toBe("09:30");
  });

  it("isValidTimeHHmm", () => {
    expect(isValidTimeHHmm("09:00")).toBe(true);
    expect(isValidTimeHHmm("24:00")).toBe(false);
  });

  it("isValidTimezoneIANA", () => {
    expect(isValidTimezoneIANA("UTC")).toBe(true);
    expect(isValidTimezoneIANA("America/Argentina/Buenos_Aires")).toBe(true);
    expect(isValidTimezoneIANA("Invalid/ZZZ_TZ_")).toBe(false);
  });

  it("sanitizeWhatsappNumber", () => {
    expect(sanitizeWhatsappNumber("+54 9 11 1234-5678")).toBe("+5491112345678");
    expect(sanitizeWhatsappNumber("abc")).toBe(null);
  });

  it("parseDaySchedule rechaza fin antes que inicio", () => {
    expect(
      parseDaySchedule({
        enabled: true,
        start: "18:00",
        end: "09:00",
      })
    ).toBe(null);
  });

  it("parseWorkingHours exige los 7 días", () => {
    expect(parseWorkingHours({})).toBe(null);
    const wh = parseWorkingHours({
      monday: { enabled: true, start: "09:00", end: "18:00" },
      tuesday: { enabled: true, start: "09:00", end: "18:00" },
      wednesday: { enabled: true, start: "09:00", end: "18:00" },
      thursday: { enabled: true, start: "09:00", end: "18:00" },
      friday: { enabled: true, start: "09:00", end: "18:00" },
      saturday: { enabled: false, start: "09:00", end: "13:00" },
      sunday: { enabled: false, start: "09:00", end: "13:00" },
    });
    expect(wh).not.toBe(null);
    expect(wh?.monday.enabled).toBe(true);
  });
});
