import {
  isValidCommerceSlug,
  normalizeCommerceSlug,
} from "@/lib/validation/commerce-slug";

export function normalizeServiceName(name: string): string {
  return name.trim();
}

export function assertValidServiceName(name: string): string | null {
  const n = normalizeServiceName(name);
  if (n.length < 1 || n.length > 120) return "El nombre debe tener entre 1 y 120 caracteres.";
  return null;
}

export function assertValidDurationMinutes(n: number): string | null {
  if (!Number.isInteger(n)) return "La duración debe ser un número entero.";
  if (n < 5 || n > 480 || n % 5 !== 0) {
    return "La duración debe estar entre 5 y 480 minutos, múltiplo de 5.";
  }
  return null;
}

export function assertValidOptionalPrice(
  price: unknown
): { ok: true; value: number | undefined } | { ok: false; error: string } {
  if (price === undefined || price === null) {
    return { ok: true, value: undefined };
  }
  if (typeof price !== "number" || !Number.isFinite(price)) {
    return { ok: false, error: "El precio no es válido." };
  }
  if (price < 0 || price > 1_000_000_000) {
    return { ok: false, error: "El precio está fuera de rango." };
  }
  return { ok: true, value: price };
}

export function assertValidStaffName(name: string): string | null {
  const n = name.trim();
  if (n.length < 1 || n.length > 120) return "El nombre debe tener entre 1 y 120 caracteres.";
  return null;
}

export function assertValidStaffSlug(slug: string): string | null {
  const s = normalizeCommerceSlug(slug);
  if (!isValidCommerceSlug(s)) {
    return "Slug inválido: solo minúsculas, números y guiones (3–80 caracteres).";
  }
  return null;
}

export function normalizeStaffSlug(slug: string): string {
  return normalizeCommerceSlug(slug);
}

/** UID de Firebase Auth (formato laxo). */
export function assertValidOptionalUserId(
  userId: unknown
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (userId === undefined || userId === null || userId === "") {
    return { ok: true, value: null };
  }
  if (typeof userId !== "string") {
    return { ok: false, error: "userId inválido." };
  }
  const u = userId.trim();
  if (u.length < 10 || u.length > 128 || !/^[a-zA-Z0-9]+$/.test(u)) {
    return { ok: false, error: "userId no parece un UID de Firebase." };
  }
  return { ok: true, value: u };
}

export function assertValidServiceIds(ids: unknown): string[] | null {
  if (!Array.isArray(ids)) return null;
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || id.length < 1 || id.length > 128) return null;
    out.push(id);
  }
  return out;
}
