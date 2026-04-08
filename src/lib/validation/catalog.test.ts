import { describe, expect, it } from "vitest";

import {
  assertValidDurationMinutes,
  assertValidOptionalPrice,
  assertValidServiceIds,
  assertValidServiceName,
  assertValidStaffSlug,
  assertValidOptionalUserId,
} from "./catalog";

describe("catalog validation", () => {
  it("assertValidServiceName", () => {
    expect(assertValidServiceName("Corte")).toBeNull();
    expect(assertValidServiceName("")).not.toBeNull();
  });

  it("assertValidDurationMinutes", () => {
    expect(assertValidDurationMinutes(30)).toBeNull();
    expect(assertValidDurationMinutes(7)).not.toBeNull();
  });

  it("assertValidOptionalPrice", () => {
    expect(assertValidOptionalPrice(undefined).ok).toBe(true);
    expect(assertValidOptionalPrice(100).ok).toBe(true);
    expect(assertValidOptionalPrice(-1).ok).toBe(false);
  });

  it("assertValidStaffSlug", () => {
    expect(assertValidStaffSlug("juan-p")).toBeNull();
    expect(assertValidStaffSlug("ab")).not.toBeNull();
  });

  it("assertValidOptionalUserId", () => {
    expect(assertValidOptionalUserId(null).ok).toBe(true);
    expect(
      assertValidOptionalUserId("a".repeat(28)).ok
    ).toBe(true);
    expect(assertValidOptionalUserId("short").ok).toBe(false);
  });

  it("assertValidServiceIds", () => {
    expect(assertValidServiceIds(["abc", "def"])).toEqual(["abc", "def"]);
    expect(assertValidServiceIds("x")).toBe(null);
  });
});
