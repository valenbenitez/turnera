import { describe, expect, it } from "vitest";

import { isValidCommerceSlug, normalizeCommerceSlug } from "./commerce-slug";

describe("commerce slug", () => {
  it("acepta slugs válidos", () => {
    expect(isValidCommerceSlug("barberia-central")).toBe(true);
    expect(isValidCommerceSlug("a12")).toBe(true);
    expect(isValidCommerceSlug("  Foo-Bar  ")).toBe(true);
  });

  it("rechaza slugs inválidos", () => {
    expect(isValidCommerceSlug("ab")).toBe(false);
    expect(isValidCommerceSlug("")).toBe(false);
    expect(isValidCommerceSlug("Barbería")).toBe(false);
    expect(isValidCommerceSlug("doble--guión")).toBe(false);
    expect(isValidCommerceSlug("-inicio")).toBe(false);
  });

  it("normaliza a minúsculas y trim", () => {
    expect(normalizeCommerceSlug("  Mi-Slug  ")).toBe("mi-slug");
  });
});
