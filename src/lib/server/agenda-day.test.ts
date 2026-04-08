import { describe, expect, it } from "vitest";

import { agendaDayUtcBounds, isValidAgendaDateParam } from "./agenda-day";

describe("isValidAgendaDateParam", () => {
  it("acepta YYYY-MM-DD", () => {
    expect(isValidAgendaDateParam("2026-04-07")).toBe(true);
  });

  it("rechaza formatos incorrectos", () => {
    expect(isValidAgendaDateParam("7/4/2026")).toBe(false);
    expect(isValidAgendaDateParam("2026-4-7")).toBe(false);
    expect(isValidAgendaDateParam("")).toBe(false);
  });
});

describe("agendaDayUtcBounds", () => {
  it("delimita el día en la zona del comercio", () => {
    const r = agendaDayUtcBounds("2026-01-15", "America/Argentina/Buenos_Aires");
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.fromUtc.toISOString()).toMatch(/2026-01-15T03:00:00\.000Z/);
    expect(r.toExclusiveUtc.toISOString()).toMatch(/2026-01-16T03:00:00\.000Z/);
  });

  it("devuelve null si la fecha no calza con el patrón", () => {
    expect(agendaDayUtcBounds("foo", "America/Argentina/Buenos_Aires")).toBeNull();
  });
});
